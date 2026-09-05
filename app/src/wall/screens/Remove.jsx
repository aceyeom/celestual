// ── /berkeley/remove/:handle — OFF THE WALL ─────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE ONE ACTION ON THIS SURFACE THAT NOBODY CAN UNDO.                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Putting a handle on a public wall says, in public, that this person is being
// written about. Nobody on that wall agreed to be there, and the way back off
// has to cost them less than being on it does. That principle has not moved.
// What moved is WHICH way off this screen is.
//
// There are two, and they are not the same act:
//
//   ONE LETTER    reported, and off the wall on the tap (screens/Report.jsx).
//                 Nothing is proven, nothing is asked, nothing is destroyed,
//                 and a desk can put it back. That is the fast door and it is
//                 the one almost everybody wants — including, most of the time,
//                 the person the letter is about.
//   YOUR NAME     this screen. Every letter written to the handle comes down,
//                 the handle can never be written to again, and no desk can
//                 reverse it. It is the only irreversible thing on the wall.
//
// ── why this one asks, when nothing else does ───────────────────────────────
// An earlier build made this instant too, and argued for it: a takedown behind
// a login says "make an account first" to the one person on the wall who never
// chose to be there. That argument is right about the COST and wrong about the
// asymmetry. Reporting a letter is undoable by a person at a desk in a minute.
// Emptying a name is undoable by nobody, ever, and what it destroys does not
// belong only to the person asking — it is forty letters written by people who
// are not in the room and cannot be asked.
//
// So the proof sits on the irreversible action and nowhere else, and it is
// bought as cheaply as a proof can be: not an account, not an address, not a
// form, not a queue. One question, is this handle yours, asked of the place the
// handle actually lives, answered once. It is the Instagram DM code flow
// (wall/handoff.js), it is real as of Phase 6b, and it is the only thing in the
// product that writes handle_verified_at.
//
// ── how it comes off, on a server ───────────────────────────────────────────
// There is no operation that empties a name. 0032 removes letters one at a
// time, and refuses a write to a handle any of whose letters were removed. So
// this screen takes down every letter it can see and the schema holds the name
// shut afterwards, which is the same outcome without a single statement that
// can empty somebody.
//
// And the person who genuinely just wants a letter about them gone is never
// sent here to get it: they tap `report it` on the letter, it is down, and this
// screen is not in their way.
//
// ── what this screen still refuses ──────────────────────────────────────────
// No reason to give. No category. No queue and no "we will look into this
// within five days". No offer of an account on the way past, and no second
// thing asked once the first is answered. The handoff is the whole of it.

import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Display, Label, Pill, Prose, HandleField, DmCode, Face,
} from '../parts.jsx'
import { Sparkle, Provider } from '../art.jsx'
import { atHandle, lettersFor, loadHandle, normHandle, removeLetter, validHandle } from '../data.js'
import { isVerified, forgetVerified } from '../auth.js'
import { startHandoff, pollHandoff, savePending, loadPending, clearPending } from '../handoff.js'

export default function Remove({ handle: prefill, back }) {
  const held = useRef(null)
  if (held.current === null) {
    const p = loadPending()
    held.current = p && p.use === 'remove' ? p : false
  }
  const [value, setValue] = useState(() => held.current?.handle || prefill || '')
  const [dm, setDm] = useState(() => held.current || null)   // { code, token, proofHash, proof }
  const [fault, setFault] = useState('')
  const [taking, setTaking] = useState(false)
  const [minting, setMinting] = useState(false)
  const [gone, setGone] = useState(null)

  // Set on the way IN as well as cleared on the way out. React's StrictMode
  // mounts, unmounts and remounts every component in development: a flag that
  // is only ever cleared in the teardown is false for the whole life of the
  // second mount, and the handoff comes back to a screen that has decided it is
  // gone.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const h = normHandle(value)
  const named = validHandle(h)
  const letters = h ? lettersFor(h) : []
  const count = letters.length
  // Proven once and remembered for the session, so somebody who reloaded is not
  // asked again. A proof that has to be repeated inside one sitting is a proof
  // that has become a password.
  const proven = named && isVerified(h)

  // What is about to go needs to be known before it goes, so the count on the
  // screen is the real one rather than whatever the wall happened to have
  // cached.
  useEffect(() => { if (named) loadHandle(h) }, [h, named])

  // ── the handoff ──
  // Mint a code, show it, and watch. Meta tells the backend who actually sent
  // it, and that account is the identity whatever was typed here first.
  const ask = async () => {
    if (!named || dm || minting) return
    setFault('')
    setMinting(true)
    const out = await startHandoff(h)
    if (!alive.current) return
    setMinting(false)
    if (!out.ok) {
      setFault(
        out.error === 'off' ? 'that door is not open yet'
          : out.error === 'rate_limited' ? 'too many tries on that @. give it an hour'
          : 'that did not go through',
      )
      return
    }
    // Stashed while the person is away in Instagram: the app can reload this
    // page out from under them, and a code minted for a wait nothing is
    // watching any more can never complete. Cleared on every way out below.
    const rec = { ...out, use: 'remove', handle: h }
    savePending(rec)
    setDm(rec)
  }

  useEffect(() => {
    if (!dm) return
    let stop = false
    // `polling` because two things drive this: the beat, and coming back to
    // the tab. Without it every return from Instagram started another chain
    // of polls beside the first, and five app switches were six chains.
    let polling = false
    const tick = async () => {
      if (stop || polling) return
      polling = true
      clearTimeout(timer)
      const out = await pollHandoff(dm)
      polling = false
      if (stop || !alive.current) return
      if (out.ok) { clearPending(); setDm(null); setValue(out.handle); return }
      if (out.error === 'expired') { clearPending(); setDm(null); setFault('that code has lapsed'); return }
      if (out.error) { clearPending(); setDm(null); setFault('that did not go through'); return }
      timer = setTimeout(tick, 2500)
    }
    let timer = setTimeout(tick, 2500)
    // Back from Instagram: check at once rather than up to a beat late, and
    // never leave the wait to an interval a backgrounded tab has throttled.
    const onReturn = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      stop = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [dm])

  // Every letter under the name, one call each. The first refusal stops it and
  // is said: this used to count the successes, ignore the rest, and declare
  // the name off the wall over zero removals when the server had refused every
  // one, which is the one screen in the product that must never say that.
  const take = async () => {
    if (!proven || taking) return
    setTaking(true)
    setFault('')
    const mine = lettersFor(h)
    let n = 0
    let err = null
    for (const l of mine) {
      const out = await removeLetter(l.id)
      if (out?.ok) { n += 1; continue }
      err = out?.error || 'network'
      break
    }
    if (!alive.current) return
    setTaking(false)
    if (err) {
      if (err === 'unverified' || err === 'no_session') {
        // This device believed the handle was proven; the server does not.
        forgetVerified(h)
        setFault('that @ is not proven on this device any more. prove it again')
      } else {
        setFault(n ? `${n} of ${mine.length} came down. the rest did not go through: try again`
          : 'it did not go through. try once more')
      }
      return
    }
    setGone({ handle: h, n })
  }

  const head = <SheetHead onClose={back} label="back to the wall"
    lead={<Sparkle size={13} className="wl-head-spark" />} />

  // ── done ──
  // It has already happened. No confirmation to accept, nothing to check an
  // inbox for, and no undo offered: an undo on this control would mean the
  // removal was never real.
  if (gone) {
    return (
      <Sheet onClose={back} labelledBy="wl-rm-h">
        <div className="wl-sheet-in wl-remove">
          {head}
          <Display size="s" as="h2" id="wl-rm-h">It&rsquo;s off the wall.</Display>
          <div className="wl-remove-gone">
            <Label tone="dim"><span className="wl-h">{atHandle(gone.handle)}</span></Label>
            <Prose className="wl-gate-copy">
              {gone.n === 0
                ? 'There was nothing under it. A name with no letters is not on the wall.'
                : `${gone.n === 1 ? 'The one letter' : `All ${gone.n} letters`} under it went with it, and the name cannot be written to again.`}
            </Prose>
          </div>
          <div className="wl-push" />
          <SheetFoot><Pill tone="light" wide onClick={back}>done</Pill></SheetFoot>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={back} tall labelledBy="wl-rm-h">
      <div className="wl-sheet-in wl-remove">
        {head}

        <Display size="s" as="h2" id="wl-rm-h">
          {proven ? <>It&rsquo;s yours.<br />Take it down.</> : <>Take your name<br />off the wall.</>}
        </Display>

        {/* Two lines, not a paragraph. What it costs, and the cheaper door
            beside it. */}
        <Prose className="wl-gate-copy">
          {proven
            ? 'Every letter under it goes too.'
            : 'Permanent. To take down one letter, report it instead.'}
        </Prose>

        <div className="wl-remove-field">
          <HandleField
            value={value} onChange={setValue} onSubmit={proven ? take : ask}
            autoFocus={!prefill} size="lg" placeholder="yourhandle"
            locked={proven || !!dm}
          />
        </div>

        {/* What is about to happen, said before it happens rather than in a
            dialogue afterwards. The count is the whole of it. */}
        <div className="wl-remove-what" aria-live="polite">
          {fault ? (
            <Label tone="dim">{fault}</Label>
          ) : validHandle(h) ? (
            <div className="wl-remove-row">
              <Face handle={h} size={28} lit={proven} />
              <Label tone="dim">
                {count === 0 ? 'no letters · no way back on'
                  : count === 1 ? 'one letter goes with it · no way back'
                  : `${count} letters go with it · no way back`}
              </Label>
            </div>
          ) : null}
        </div>

        <div className="wl-push" />

        <SheetFoot>
          {proven ? (
            <Pill tone="light" wide disabled={taking} onClick={take}>
              {taking ? 'taking it down…' : 'take it down'}
            </Pill>
          ) : dm ? (
            /* ── the code ──
               The whole of the proof, on one screen: a code, where to send it,
               and the fact that we are watching. No form, no account, no queue.
               Whoever sends it from Instagram is who this is, which is why the
               field above is locked while it is out.

               Drawn by parts.DmCode, which is the same block Main's proof step
               draws. It used to be a local copy whose "open instagram" pill
               rendered a <button href>: inert, on the only way out of the only
               irreversible action on the wall. */
            <>
              <DmCode code={dm.code} />
              <button type="button" className="wl-quiet wl-dm-drop"
                onClick={() => { clearPending(); setDm(null) }}>
                start this again
              </button>
            </>
          ) : (
            <>
              {/* ── the handoff ──
                  Drawn as a destination rather than as a security step: one
                  button, the provider's shape on the same 24-unit grid as every
                  other glyph here, and the sentence under it saying exactly
                  what is asked and what is kept. */}
              <Pill
                tone="light" wide disabled={!named || minting} onClick={ask}
                icon={<Provider size={17} />}
              >
                {minting ? 'one moment' : 'prove it is yours'}
              </Pill>
              <div className="wl-remove-handoff">
                <Label tone="dim">one question · nothing is kept</Label>
              </div>
            </>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

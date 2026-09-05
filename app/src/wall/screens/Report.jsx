// ── /berkeley/report/:id — IT COMES DOWN ────────────────────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE TAP TAKES IT OFF THE WALL. EVERYTHING ELSE HAPPENS TO A LETTER      ║
// ║  NOBODY CAN SEE.                                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every report queue ever built has the order backwards: the letter stays up
// while somebody decides whether the complaint was fair, and the person it is
// about waits, in public, for a stranger's verdict about their own day. The
// screenshot exists before the verdict does. A ninety-second exposure window is
// not a small version of the harm — it IS the harm, and the reasoning that
// happens afterwards cannot reach back and undo it.
//
// So this screen inverts it, and the inversion is the only interesting thing
// about it. One tap, one control, no dialogue: the letter leaves the wall, the
// search and the count on the press, and every step after that happens to
// something nobody can read any more.
//
// ── the three steps, and what each is honestly for ──────────────────────────
//
//   0  THE TAP        One pill. No category to pick, no severity, no checkbox
//                     saying you understand. Categories exist to route work in
//                     a support tool; here they would exist to make the person
//                     tapping argue their case before anything happened, which
//                     is the delay again wearing a form.
//   1  THE SMALL BOX  It is already down. NOW: why. Optional, three lines, no
//                     counter. It is not evidence and nobody is making a case:
//                     the box exists so the desk reads the letter with the one
//                     piece of context it cannot derive — what somebody who saw
//                     it thought it was.
//   2  THE READING    A model reads the reason against the same categories the
//                     publication screen uses, and decides ONLY where this
//                     lands: confirmed, or a person looks at it. Not whether it
//                     comes down — that already happened — and never a score,
//                     a strike, or a number about anybody.
//
// It is never deleted. Being reported moves a letter into a held state the wall
// filters out (data.js `report`), and a desk can read it and put it back
// (`restore`). A takedown that destroys what it took down is a takedown no
// review can ever be right about, and on a surface where any signed-in reader
// can take down any letter, the review being able to be right is the entire
// safeguard for the person who wrote it.
//
// ── why it is behind the address ────────────────────────────────────────────
// Because it takes something down. Reading is gated so the wall is a room with
// a door on it; writing is gated so it is not an open relay; reporting is gated
// for the plainest reason of the three — a one-tap control over what is on a
// public wall, reachable by the whole internet, means the wall's contents are
// decided by whoever is bored. It is the same door, opened once, and it is the
// cheapest thing that is not nothing.

import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Display, Label, Pill, Prose,
  ReasonField, Locked, Icon,
} from '../parts.jsx'
import { Sparkle } from '../art.jsx'
import { letter, loadLetter, report, atHandle, ago } from '../data.js'
import { setAfterGate } from '../store.js'

export default function Report({ id, go, back }) {
  const [step, setStep] = useState(0)     // 0 the tap · 1 the box · 2 it is filed
  const [why, setWhy] = useState('')
  const [fault, setFault] = useState('')
  const [busy, setBusy] = useState(false)
  // Held once it arrives: the letter is about to come off the wall, and the
  // screen that took it down still has to be able to name it afterwards.
  const held = useRef(null)
  const live = letter(id)
  if (live && !held.current) held.current = live
  const one = held.current

  useEffect(() => { loadLetter(id) }, [id])

  // ── the tap ──
  // It comes down here, in the same request that files the report, and step 1
  // is only reached once the server has said so. Advancing the screen first and
  // sending afterwards would be a screen that says "it's down" about a letter
  // that might still be up.
  const take = async (reason) => {
    if (busy) return
    setBusy(true)
    const out = await report(id, reason)
    setBusy(false)
    if (out?.ok) { setStep(reason ? 2 : 1); return }
    setFault(out?.error === 'gate' || out?.error === 'no_session' ? 'gate'
      : out?.error === 'rate_limited' ? 'rate' : 'network')
  }

  const head = <SheetHead onClose={back} label="back to the wall"
    lead={<Sparkle size={13} className="wl-head-spark" />} />

  if (live === undefined && !one) {
    return (
      <Sheet onClose={back} labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">Reading it.</Display>
          <div className="wl-push" />
        </div>
      </Sheet>
    )
  }

  if (!one) {
    return (
      <Sheet onClose={back} labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">It is already down.</Display>
          <Prose className="wl-gate-copy">Nothing here is on the wall any more.</Prose>
          <div className="wl-push" />
          <SheetFoot><Pill tone="light" wide onClick={back}>back to the wall</Pill></SheetFoot>
        </div>
      </Sheet>
    )
  }

  // ── the door ──
  // Said in the one wording the build uses everywhere this door is met, and
  // said INSTEAD of the control rather than under a disabled one. A greyed-out
  // button with an explanation beside it makes somebody read a sentence to find
  // out they cannot do the thing; this makes the sentence the thing.
  //
  // The gate is the server's answer, not this tab's: a letter read from outside
  // the campus arrives with no body, and wall_report refuses the same reader.
  if (one.body === null || fault === 'gate') {
    return (
      <Sheet onClose={back} labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">Reports come<br />from Berkeley.</Display>
          <div className="wl-push" />
          <Locked onOpen={() => { setAfterGate({ name: 'report', id }); go('gate') }}>
            Sign in to take a letter down.
          </Locked>
        </div>
      </Sheet>
    )
  }

  // ── 0 · the tap ──
  if (step === 0) {
    return (
      <Sheet onClose={back} tall labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">This comes down<br />when you tap it.</Display>

          <div className="wl-report-what">
            <Label tone="dim">
              the letter under <span className="wl-h">{atHandle(one.to)}</span> · {ago(one.at)}
            </Label>
            {/* The words themselves, quoted short. Somebody about to take a
                letter off a public wall should be looking at the letter while
                they do it — not at a confirmation dialogue describing one. */}
            <p className="wl-report-quote">
              {one.body.length > 150 ? `${one.body.slice(0, 150).trim()}…` : one.body}
            </p>
          </div>

          {/* Three facts, one line each, in the order they happen. It was one
              forty word paragraph saying the same three things, on a screen
              where the control is the point and nobody is reading. */}
          <ul className="wl-facts">
            <li>Off the wall now.</li>
            <li>Someone reads it after.</li>
            <li>If it is fine, it goes back up.</li>
          </ul>

          <div className="wl-push" />

          <SheetFoot>
            <Pill tone="light" wide icon={<Icon name="flag" size={17} />}
              disabled={busy} onClick={() => take('')}>
              {busy ? 'taking it down…' : 'take it down'}
            </Pill>
            {fault === 'network' ? (
              <Label tone="dim">it did not go through</Label>
            ) : fault === 'rate' ? (
              <Label tone="dim">that is a lot of reports in one hour. give it time</Label>
            ) : null}
            <button type="button" className="wl-quiet" onClick={back}>leave it up</button>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  // ── 1 · the small box ──
  if (step === 1) {
    return (
      <Sheet onClose={back} tall labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">It&rsquo;s down.</Display>
          <Label tone="dim" className="wl-report-done">
            off the wall · <span className="wl-h">{atHandle(one.to)}</span>
          </Label>

          <Prose className="wl-gate-copy">Saying why is optional.</Prose>

          <ReasonField
            value={why} onChange={setWhy} autoFocus
            placeholder="it is about me, and I did not want it up"
          />

          <div className="wl-push" />

          <SheetFoot>
            {/* The letter is already down; this only adds the words. A second
                report on the same letter is a second row for the desk, which is
                what a person adding a reason after the fact actually wants. */}
            <Pill tone="light" wide disabled={busy} onClick={() => (why.trim() ? take(why) : setStep(2))}>
              {why.trim() ? 'send it' : 'send it without a reason'}
            </Pill>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  // ── 2 · it is filed ──
  // No machine is shown thinking here. The letter came off on the tap and the
  // report is a row waiting for a person, which is the product's actual
  // position: the screen routes, a person decides. Drawing a classifier
  // deliberating over a report would be drawing something that does not happen.
  //
  // Every reporter is told the same two sentences, whichever way the reading
  // eventually goes. A reporter who learns which words get a faster result is a
  // reporter who has been taught to write them.
  return (
    <Sheet onClose={back} labelledBy="wl-rep-h">
      <div className="wl-sheet-in wl-report">
        {head}
        <Display size="s" as="h2" id="wl-rep-h">Someone will<br />look at it.</Display>

        <div className="wl-report-read">
          <Prose className="wl-gate-copy">Off the wall, and a person reads it from here.</Prose>
        </div>

        <div className="wl-push" />

        <SheetFoot>
          <Pill tone="light" wide onClick={back}>back to the wall</Pill>
        </SheetFoot>
      </div>
    </Sheet>
  )
}

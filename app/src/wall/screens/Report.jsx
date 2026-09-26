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
//
// ── said before the tap, and asked once ─────────────────────────────────────
// Somebody not signed in used to press "report it", be told by the server
// that they could not, see the sheet turn into "sign in to report this
// letter." with a lone "sign in", and then meet the gate saying "sign in to
// report it.": two sign in screens in a row, and back on the first step
// afterwards to press "report it" a second time. Now the step says it first:
// the key reads "sign in and report it" with the line "it asks you to sign in
// first." under it, and the press goes straight to the gate, which comes back
// here and files the report on the way in (`WANTED`), so the one press is
// the report. A server that refuses a report this tab thought it could file
// is sent the same way.

import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Display, Label, Pill, ClosePill, CloseQuiet, Prose,
  ReasonField,
} from '../parts.jsx'
import { letter, loadLetter, report, labelFor, ago } from '../data.js'
import { isReader } from '../auth.js'
import { setAfterGate } from '../store.js'

// The report asked for by somebody who had to sign in first, filed when
// they come back signed in. In the session's storage rather than in memory,
// since a Google sign in leaves the page and comes back to a fresh one.
const WANTED = 'celestual.report.wanted'
function want(id) {
  try { sessionStorage.setItem(WANTED, String(id)) } catch { /* private mode */ }
}
function wanted(id) {
  try {
    if (sessionStorage.getItem(WANTED) !== String(id)) return false
    sessionStorage.removeItem(WANTED)
    return true
  } catch { return false }
}

export default function Report({ id, go, up, upLabel = 'back to the wall' }) {
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

  // ── the door, on the way ──
  // To the gate with this report as the way back, and the report remembered
  // so it is filed the moment this sheet is back and signed in.
  const signFirst = () => {
    want(id)
    setAfterGate({ name: 'report', id })
    go('gate')
  }

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
    if (out?.error === 'gate' || out?.error === 'no_session') { signFirst(); return }
    setFault(out?.error === 'rate_limited' ? 'rate' : 'network')
  }

  // Back from the gate, signed in, with this report asked for: it is filed
  // once the letter is on the sheet again (the sign in emptied the cache it
  // was in), and the sheet opens on the box.
  const ready = one ? one.id : ''
  useEffect(() => {
    if (ready && isReader() && wanted(id)) take('')
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  const head = <SheetHead onClose={up} label={upLabel} />

  if (live === undefined && !one) {
    return (
      <Sheet onClose={up} labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">finding the letter.</Display>
          <div className="wl-push" />
        </div>
      </Sheet>
    )
  }

  if (!one) {
    return (
      <Sheet onClose={up} labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">it&rsquo;s already down.</Display>
          <Prose className="wl-gate-copy">this letter is not on the wall any more.</Prose>
          <div className="wl-push" />
          <SheetFoot><ClosePill tone="light" wide onClose={up}>{upLabel}</ClosePill></SheetFoot>
        </div>
      </Sheet>
    )
  }

  // ── 0 · the tap ──
  // Anybody signed in by any proof can take a letter down, since 0044. It is
  // the direction that protects the person the letter is about: the likeliest
  // reader to want a letter down is its subject, and the subject holds a
  // handle far more often than they hold a berkeley.edu address at the moment
  // they find their name. Anybody else is told so on this step, under the one
  // key, and the key says what it does: the head of this file says why.
  if (step === 0) {
    const reader = isReader()
    return (
      <Sheet onClose={up} tall labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">report this letter.</Display>

          <div className="wl-report-what">
            <Label tone="dim">
              the letter to <span className="wl-h">{labelFor(one.to)}</span> · {ago(one.at)}
            </Label>
            {/* The words themselves, quoted short. Somebody about to take a
                letter off a public wall should be looking at the letter while
                they do it — not at a confirmation dialogue describing one. */}
            <p className="wl-report-quote">
              {String(one.body || '').length > 150 ? `${String(one.body).slice(0, 150).trim()}…` : one.body}
            </p>
          </div>

          {/* One line, and it is the only line. This was a forty word paragraph
              first and then three bulleted facts, and the list was the worse of
              the two: a numbered account of an internal process, set out like
              terms, above a button whose whole argument is that there is nothing
              here to think about. Somebody standing on this screen wants to know
              what the tap does, which is one sentence long. For somebody not
              signed in it is two: the second says what the tap asks first. */}
          <Prose className="wl-gate-copy">
            {reader
              ? 'it comes down right away while a person reviews it.'
              : 'it comes down right away while a person reviews it. it asks you to sign in first.'}
          </Prose>

          <div className="wl-push" />

          <SheetFoot>
            <Pill tone="light" wide
              disabled={busy} onClick={reader ? () => take('') : signFirst}>
              {busy ? 'reporting…' : reader ? 'report it' : 'sign in and report it'}
            </Pill>
            {fault === 'network' ? (
              <Label tone="dim">the report did not go through. try again</Label>
            ) : fault === 'rate' ? (
              <Label tone="dim">that is a lot of reports in one hour. try again later</Label>
            ) : null}
            <CloseQuiet onClose={up}>leave it up</CloseQuiet>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  // ── 1 · the small box ──
  if (step === 1) {
    return (
      <Sheet onClose={up} tall labelledBy="wl-rep-h">
        <div className="wl-sheet-in wl-report">
          {head}
          <Display size="s" as="h2" id="wl-rep-h">it&rsquo;s down.</Display>
          <Label tone="dim" className="wl-report-done">
            off the wall · <span className="wl-h">{labelFor(one.to)}</span>
          </Label>

          <Prose className="wl-gate-copy">a person will review it. you can tell them why, or skip this.</Prose>

          <ReasonField
            value={why} onChange={setWhy} autoFocus
            placeholder="it is about me, and i did not want it up"
          />

          <div className="wl-push" />

          <SheetFoot>
            {/* The letter is already down; this only adds the words. A second
                report on the same letter is a second row for the desk, which is
                what a person adding a reason after the fact actually wants. */}
            <Pill tone="light" wide disabled={busy} onClick={() => (why.trim() ? take(why) : setStep(2))}>
              {why.trim() ? 'send the reason' : 'skip'}
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
    <Sheet onClose={up} labelledBy="wl-rep-h">
      <div className="wl-sheet-in wl-report">
        {head}
        <Display size="s" as="h2" id="wl-rep-h">a person will<br />review it.</Display>

        <div className="wl-report-read">
          <Prose className="wl-gate-copy">it stays off the wall while they do. if it breaks no rules, they can put it back.</Prose>
        </div>

        <div className="wl-push" />

        <SheetFoot>
          <ClosePill tone="light" wide onClose={up}>{upLabel}</ClosePill>
        </SheetFoot>
      </div>
    </Sheet>
  )
}

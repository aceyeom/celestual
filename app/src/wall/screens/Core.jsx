// ── /berkeley/orbit — THE CORE SERVICE ──────────────────────────────────────
//
// The service the wall exists to fill, and a DIFFERENT PLACE from the wall.
// It is reached from exactly one control — the tab at the bottom of the wall,
// which appears only once somebody has put a letter up — and it is the first
// point in the whole prototype where anybody has an identity at all.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE COMPOSITION: ONE LETTER AT A TIME, LAID SIDEWAYS                    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three earlier versions of this screen are gone, and each was thrown out for
// a reason worth keeping written down:
//
//   1  A DATE SET AS THE HEADLINE. The old screen gave its largest, brightest
//      object to 17.03.2026 and then restated it twice more. wall.css said so
//      in its own comment — "on this screen the date is the headline" — which
//      is the whole diagnosis. A ledger's headline is not a date.
//   2  A RING DIAGRAM THAT SHARED NO GEOMETRY WITH THE MARK. Three axis-aligned
//      ellipses in 0.34-unit hairlines, under a logo built out of a filled band
//      at -19° whose width varies three to one. It encoded three numbers the
//      rows underneath already carried, in words, more precisely.
//   3  A STACK OF OPEN CREAM CARDS. Every letter drawn open, at one weight, so
//      the page was three near-identical beige blocks — a crowded page of
//      letters however good each card was.
//
// What is here instead:
//
//   THE SHEET       One letter, centred, with air above and below. The writing
//                   is the only thing set in a reading face and the only thing
//                   ON the paper.
//   THE SILL        Everything about the letter that is not the letter —
//                   handle, state, days — sits UNDER the sheet in mono. It is
//                   ground, not paper, and that separation is the composition.
//   NO HEADLINE     Nothing on this surface editorialises. There is no Bodoni
//                   sentence anywhere; the objects carry the state.
//   THE PIPS        Where you are in what you hold. A held letter is a dash,
//                   an answered one is lit, a free place is a hollow ring.
//
// ── two, and the surface never says otherwise ───────────────────────────────
// A free place is one more position in the spread, reached by moving to it.
// When both places are held it DOES NOT EXIST — no slide, no pip, no sentence.
// Nothing on this screen refers, in any state, to a place beyond these two.
//
// ── the gestures, and what each one costs ───────────────────────────────────
//   sideways        move through what you are holding. The cheap one.
//   down and off    let a letter go. The only irreversible act here, so it
//                   takes the longest travel on an axis nothing else uses.
//   tap the count   sixty more days. Renewing is free and reversible, so it
//                   costs one tap on the very number it changes.
//   tap the sheet   open it, with renew and let-go as ordinary controls.
//
// Every one of those has a tap path behind it: the sheet opens on tap and
// carries both actions, so nothing here is reachable only by dragging.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  Label, Pill, Close,
  Sheet, SheetHead, SheetFoot, Paper, Prose, HandleField, LetterField,
} from '../parts.jsx'
import { Mark, Sparkle, Dots } from '../art.jsx'
import { ME } from '../seed.js'
import { atHandle, dateline, normHandle, validHandle } from '../data.js'
import {
  pings, ping, slots, place, renew, release,
  since, left, NOW, SPAN,
} from '../orbit.js'

// The opening sentence of a letter is set larger than the rest. A letter has
// an opening; a paragraph in a box does not.
function opened(text) {
  const raw = String(text || '')
  const i = raw.indexOf('. ')
  if (i > 0 && i < 165) {
    return <><span className="wl-open-line">{raw.slice(0, i + 1)}</span>{raw.slice(i + 2)}</>
  }
  return <span className="wl-open-line">{raw}</span>
}

export default function Core({ id, go, reduce }) {
  // ── why this counter exists ──
  // The ledger lives in store.js, which is a blob under a key and not a React
  // anything, so nothing re-renders when a mutation lands. Every mutation on
  // this surface is followed by `bump`, and the ledger is read fresh on the
  // render it causes.
  const [beat, bump] = useReducer((n) => n + 1, 0)
  const rows = useMemo(() => pings(), [beat, id])
  const slot = useMemo(() => slots(), [beat, id])

  // The spread: what you hold, then one position per free place. `slot.open`
  // is derived from the cap, so a held pair produces no vacant slide at all.
  const spread = useMemo(() => ([
    ...rows,
    ...Array.from({ length: slot.open }, (_, i) => ({ vacant: true, id: `open-${i}` })),
  ]), [rows, slot.open])

  // ── the position is a letter, not a number ──
  // `pings()` sorts by what is closest to running out, so renewing a letter
  // moves it in the order. If the position were an index, the letter you just
  // acted on would vanish sideways and a different one would take its place
  // under your finger. So the position is held as the row's ID: the letter you
  // are on stays the letter you are on, and the track glides to wherever it
  // went — which is the honest way to show that it is no longer the urgent one.
  //
  // When the ID disappears (you let the letter go) the index is the fallback,
  // so whatever moves into that position is what you are looking at.
  const [anchor, setAnchor] = useState(null)
  const mark = useRef(0)
  const here = useMemo(() => {
    const i = spread.findIndex((p) => p.id === anchor)
    const k = i >= 0 ? i : Math.max(0, Math.min(spread.length - 1, mark.current))
    mark.current = k
    return k
  }, [spread, anchor])
  const now = spread[here] || null
  const setAt = useCallback((i) => {
    const p = spread[Math.max(0, Math.min(spread.length - 1, i))]
    mark.current = Math.max(0, Math.min(spread.length - 1, i))
    setAnchor(p ? p.id : null)
  }, [spread])

  const open = id && id !== 'place' ? ping(id) : null
  const back = useCallback(() => go('orbit'), [go])

  return (
    <>
      <div className="wl-page wl-core">
        <header className="wl-top">
          <div className="wl-top-mark">
            <Mark handle={ME} size={26} lit />
            <Label><span className="wl-h">{atHandle(ME)}</span></Label>
          </div>
          <Close onClick={() => go('wall')} label="back to the wall" />
        </header>

        <Spread
          spread={spread} at={here} setAt={setAt}
          onOpen={(p) => go('orbit', p.id)}
          onPlace={() => go('orbit', 'place')}
          onRelease={(p) => { release(p.id); bump() }}
          reduce={reduce}
        />

        <Sill
          row={now}
          onRenew={(p) => { renew(p.id); bump() }}
          onOpen={(p) => go('orbit', p.id)}
          held={slot.held} cap={slot.cap}
        />

        <Pips spread={spread} at={here} setAt={setAt} />
      </div>

      {id === 'place' && (slot.full
        ? <Full held={rows.filter((p) => p.state !== 'mutual')} bump={bump} back={back} />
        : <Place bump={bump} go={go} back={back} />)}
      {open && open.state === 'mutual' && <Reveal ping={open} back={back} reduce={reduce} />}
      {open && open.state !== 'mutual' && <Standing ping={open} go={go} bump={bump} back={back} />}
    </>
  )
}

// ── the spread ──────────────────────────────────────────────────────────────
// A track of full-width slides moved by transform. Sideways navigates; down and
// off releases. The axis locks once at seven pixels of travel and does not
// switch mid-drag, so the destructive gesture can never be entered by accident
// on the way to the safe one.
function Spread({ spread, at, setAt, onOpen, onPlace, onRelease, reduce }) {
  const box = useRef(null)
  const track = useRef(null)
  const drag = useRef({ live: false, axis: '', dx: 0, dy: 0, sx: 0, sy: 0, t: 0 })
  const [cue, setCue] = useState(0)

  const DROP = 130           // how far a letter falls before it is gone
  const put = useCallback((i, animate) => {
    const t = track.current
    if (!t) return
    t.classList.toggle('is-grab', !animate)
    t.style.transform = `translateX(${-i * 100}%)`
    if (!animate) requestAnimationFrame(() => t.classList.remove('is-grab'))
  }, [])

  useEffect(() => { put(at, !reduce) }, [at, put, reduce])

  const held = () => (track.current ? track.current.children[at] : null)
  const sheetOf = () => { const s = held(); return s ? s.querySelector('.wl-slide-in') : null }

  function down(e) {
    if (e.target.closest('.wl-vacant')) return
    const d = drag.current
    d.live = true; d.axis = ''; d.dx = 0; d.dy = 0
    d.sx = e.clientX; d.sy = e.clientY; d.t = performance.now()
    track.current && track.current.classList.add('is-grab')
    box.current && box.current.setPointerCapture(e.pointerId)
  }
  function move(e) {
    const d = drag.current
    if (!d.live) return
    d.dx = e.clientX - d.sx; d.dy = e.clientY - d.sy
    if (!d.axis && (Math.abs(d.dx) > 7 || Math.abs(d.dy) > 7)) {
      d.axis = Math.abs(d.dx) > Math.abs(d.dy) ? 'x' : 'y'
    }
    if (d.axis === 'x') {
      const w = box.current ? box.current.clientWidth || 1 : 1
      track.current.style.transform = `translateX(${-at * 100 + (d.dx / w) * 100}%)`
    } else if (d.axis === 'y' && d.dy > 0) {
      const s = sheetOf()
      if (!s) return
      const k = d.dy * 0.6
      s.style.transform = `translateY(${k}px) scale(${(1 - Math.min(0.06, k / 1600)).toFixed(4)})`
      s.style.opacity = String(Math.max(0.45, 1 - k / 430))
      setCue(Math.min(1, k / DROP))
    }
  }
  function up() {
    const d = drag.current
    if (!d.live) return
    d.live = false
    const s = sheetOf()
    if (s) { s.style.transform = ''; s.style.opacity = '' }
    setCue(0)
    track.current && track.current.classList.remove('is-grab')

    if (d.axis === 'x') {
      const w = box.current ? box.current.clientWidth || 1 : 1
      const v = d.dx / Math.max(1, performance.now() - d.t)
      const far = Math.abs(d.dx) > w * 0.26 || Math.abs(v) > 0.5
      const next = !far ? at : Math.max(0, Math.min(spread.length - 1, at + (d.dx < 0 ? 1 : -1)))
      if (next === at) put(at, true); else setAt(next)
      return
    }
    if (d.axis === 'y' && d.dy * 0.6 >= DROP) {
      const row = spread[at]
      // A pair that has closed holds no slot and is not yours to let go of.
      if (row && !row.vacant && row.state !== 'mutual') { onRelease(row); return }
    }
    if (d.axis === '') { const row = spread[at]; if (row && !row.vacant) onOpen(row) }
    put(at, true)
  }

  // ── the same four moves without a pointer ──
  // Every gesture here has a tap path, and a tap path is not a keyboard path.
  // The slide you are on is the one tab stop: arrows move through the spread,
  // Enter opens the letter, and Backspace lets it go — the destructive one is
  // the only key that is not on the way to anything else. The free place is
  // already a button and keeps its own.
  function keys(e) {
    const row = spread[at]
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = Math.max(0, Math.min(spread.length - 1, at + (e.key === 'ArrowRight' ? 1 : -1)))
      if (next !== at) { e.preventDefault(); setAt(next) }
      return
    }
    if (!row || row.vacant) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row); return }
    if ((e.key === 'Backspace' || e.key === 'Delete') && row.state !== 'mutual') {
      e.preventDefault(); onRelease(row)
    }
  }

  return (
    <div
      className="wl-spread" ref={box}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onKeyDown={keys}
    >
      <div className="wl-track" ref={track}>
        {spread.map((p, i) => (
          <div className="wl-slide" key={p.id}>
            <div
              className="wl-slide-in"
              tabIndex={p.vacant ? undefined : (i === at ? 0 : -1)}
              role={p.vacant ? undefined : 'button'}
              aria-label={p.vacant ? undefined : `a letter to ${atHandle(p.handle)} — open it`}
            >
              {p.vacant ? <Vacant onClick={onPlace} /> : <Letter ping={p} />}
            </div>
          </div>
        ))}
      </div>
      <span className="wl-drop-cue" style={{ opacity: cue }} aria-hidden="true">let it go</span>
    </div>
  )
}

// ── a letter ────────────────────────────────────────────────────────────────
// The leaf carries the writing and nothing else. Its handle, its state and its
// clock are on the sill beneath it — see `Sill`.
//
// It used to carry a crest as well: the recipient's mark, circled, with the
// sixty days drawn round it as a gauge. Both halves of that were said again
// forty pixels lower — the sill names the same handle and counts the same
// days — so the card had a second, weaker copy of its own caption sitting in
// the middle of it. The gauge was worth keeping and is now inside the count
// itself, which is the control that changes it.
function Letter({ ping: p }) {
  return (
    <Paper
      className="wl-leaf"
      tone={p.state === 'mutual' ? '' : 'shut'}
      dateline={{ lead: dateline(p.placedAt).lead, stamp: p.state === 'mutual' ? 'unsealed' : 'sealed' }}
    >
      <Prose>{opened(p.yours)}</Prose>
    </Paper>
  )
}

// ── a place with nothing in it ──────────────────────────────────────────────
// Two of the eight drawings this was tried as, composed: at rest it is a
// letter's SHADOW with no letter above it — nothing on the surface but the
// absence of one — and inside that absence, a BLANK: an @ and a rule where a
// handle would be written. Approach it and paper falls into its own shadow.
//
// It is never a box on the home screen. It is one more position in the spread,
// it only exists while a place is genuinely free, and it says nothing about
// any place beyond the two.
function Vacant({ onClick }) {
  return (
    <button type="button" className="wl-vacant" onClick={onClick}>
      <span className="wl-vacant-shadow" aria-hidden="true" />
      <span className="wl-vacant-paper" aria-hidden="true" />
      <span className="wl-vacant-in">
        <span className="wl-vacant-blank">
          <span className="wl-vacant-at">@</span>
          <span className="wl-vacant-ph">name someone</span>
        </span>
        <span className="wl-vacant-note">sixty days &middot; renewing is free</span>
      </span>
    </button>
  )
}

// ── the sill ────────────────────────────────────────────────────────────────
// Everything true about the letter that is not the letter. The count is a
// control because the count is the thing renewing changes: one tap on the very
// number, and it rolls rather than swapping, because sixty more days is the
// nicest thing that happens on this screen.
//
// A pair that has closed has no clock — there is nothing left to run out — so
// on that one row the control in the count's place opens the pair instead.
function Sill({ row, onRenew, onOpen, held, cap }) {
  const [roll, setRoll] = useState(null)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  if (!row) return <div className="wl-sill" />
  if (row.vacant) {
    return (
      <div className="wl-sill">
        <span className="wl-sill-h wl-sill-h-quiet">a free place</span>
        <span className="wl-sill-s">{held} of {cap} held</span>
      </div>
    )
  }

  const mutual = row.state === 'mutual'
  const near = row.state === 'lapsing'

  function wind() {
    if (mutual) return
    const from = row.days
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 620)
      const eased = 1 - Math.pow(1 - k, 3)
      setRoll(Math.round(from + (SPAN - from) * eased))
      if (k < 1) raf.current = requestAnimationFrame(step)
      else { setRoll(null); onRenew(row) }
    }
    raf.current = requestAnimationFrame(step)
  }

  return (
    <div className="wl-sill">
      <span className="wl-sill-h wl-h">{atHandle(row.handle)}</span>
      <span className="wl-sill-s">{mutual ? 'answered' : 'sealed'}</span>
      <button
        type="button"
        className={`wl-days${near && roll == null ? ' is-near' : ''}${mutual ? ' is-act' : ''}`}
        style={mutual ? undefined : { '--left': Math.max(0, Math.min(1, (roll ?? row.days) / SPAN)) }}
        onClick={mutual ? () => onOpen(row) : wind}
        aria-label={mutual ? 'open the pair' : `renew — ${left(row.days)} left`}
      >
        <span className="wl-days-t">
          {mutual ? 'open the pair' : roll != null ? `${roll} days` : left(row.days)}
        </span>
      </button>
    </div>
  )
}

// ── where you are in what you hold ──────────────────────────────────────────
// A dash per letter, lit if it has been answered, and a hollow ring for a place
// that is free.
//
// There was a count on the right — "2 of 2" — and it had to go: a pair that has
// closed is a pip but not a slot, so the row could show three marks beside the
// figure two and be telling the truth twice in two different units. The marks
// alone say where you are, and the sill says how many places are held on the
// one slide where that is the question.
function Pips({ spread, at, setAt }) {
  return (
    <div className="wl-pips">
      {spread.map((p, i) => (
        <button
          key={p.id} type="button"
          className={`wl-pip${p.vacant ? ' is-free' : ''}${p.state === 'mutual' ? ' is-answered' : ''}${i === at ? ' is-on' : ''}`}
          onClick={() => setAt(i)}
          aria-label={p.vacant ? 'a free place' : atHandle(p.handle)}
          aria-current={i === at ? 'true' : undefined}
        />
      ))}
    </div>
  )
}

// ── the reveal ──────────────────────────────────────────────────────────────
// A mutual is two cards, and the only moment in the entire product where both
// of them are readable. So they are shown TOGETHER, one above the other, on the
// same sheet — never one at a time behind a tab or a button, because the
// simultaneity is the thing that happened and any control between them takes it
// away. The second card rises 220ms behind the first (wall.css), which is the
// reveal: two cards that were already there would be a page.
//
// Both are dated off this surface's own clock (orbit.js NOW) and they are dated
// DIFFERENTLY, because a sixty-day mechanism whose two halves carry the same
// date is claiming the pair was written in one morning.
function Reveal({ ping: p, back, reduce }) {
  return (
    <Sheet onClose={back} tall labelledBy="wl-reveal-h">
      <div className="wl-sheet-in wl-reveal">
        <SheetHead onClose={back} />
        <div className="wl-reveal-head">
          <Label tone="dim" as="h2" id="wl-reveal-h">
            <span className="wl-h">{atHandle(p.handle)}</span> &middot; both wrote
          </Label>
        </div>

        <div className="wl-pairpaper is-open">
          <Paper
            dateline={{ lead: dateline(p.placedAt).lead, stamp: 'yours' }}
            crest={<Mark handle={p.handle} size={28} lit />}
          >
            <Prose>{p.yours}</Prose>
          </Paper>

          <div className="wl-pairpaper-join" aria-hidden="true">
            <Sparkle size={14} twinkle={!reduce} />
          </div>

          <Paper
            dateline={{ lead: dateline(p.answeredAt).lead, stamp: 'theirs' }}
            crest={<Mark handle={ME} size={28} lit />}
            tone="theirs"
          >
            <Prose>{p.theirs}</Prose>
          </Paper>
        </div>

        <SheetFoot>
          <p className="wl-say">
            shown to the two of you and to nobody else. a pair that has closed
            is not waiting on anybody, so it holds no place.
          </p>
        </SheetFoot>
      </div>
    </Sheet>
  )
}

// ── a letter, opened ────────────────────────────────────────────────────────
// The tap path behind the two gestures. Renewing is free, reversible and the
// thing most people want; letting go is the only irreversible act on this
// surface. A pair of matched buttons would say those are the same size of
// decision, so they are not matched.
//
// ── the confirmation does not replace the letter ────────────────────────────
// `let it go` swaps the FOOT and nothing else. It first swapped the whole sheet
// for a heading and two buttons, which took the card off the screen at exactly
// the moment somebody was deciding whether to destroy it: the words they wrote,
// to the person they wrote them to, are the entire content of the decision.
function Standing({ ping: p, go, bump, back }) {
  const [asking, setAsking] = useState(false)
  const [done, setDone] = useState(false)
  const near = p.state === 'lapsing'

  return (
    <Sheet onClose={back} tall labelledBy="wl-standing-h">
      <div className="wl-sheet-in wl-reveal">
        <SheetHead onClose={back} />
        <div className="wl-reveal-head">
          <Label tone="dim" as="h2" id="wl-standing-h">
            <span className="wl-h">{atHandle(p.handle)}</span> &middot; placed {since(p.placedAt)}
          </Label>
        </div>

        <div className="wl-pairpaper">
          <Paper
            dateline={{ lead: dateline(p.placedAt).lead, stamp: done ? left(SPAN) : left(p.days) }}
            crest={<Mark handle={p.handle} size={28} gauge={p.run} tone={near ? 'near' : ''} />}
          >
            <Prose>{p.yours}</Prose>
          </Paper>
        </div>

        {/* The rail that used to sit here — twelve ticks and "day 56 of sixty"
            — is gone. The stamp on the card above already carries that number,
            and it carried it more precisely. */}
        <p className="wl-say wl-run-say">
          {asking
            ? 'the letter comes off the ledger and the place opens back up. nothing is kept, and no desk can put it back.'
            : 'they have not placed one to you. nothing about this is shown to them, and nothing will be unless they do.'}
        </p>

        <SheetFoot>
          {asking ? (
            <>
              <Pill tone="light" wide onClick={() => { release(p.id); bump(); go('orbit') }}>
                let it go
              </Pill>
              <button type="button" className="wl-quiet" onClick={() => setAsking(false)}>keep it</button>
            </>
          ) : (
            <>
              <Pill
                tone="light" wide disabled={done}
                onClick={() => { renew(p.id); setDone(true); bump() }}
              >
                {done ? 'renewed' : 'sixty more days'}
              </Pill>
              <button type="button" className="wl-quiet" onClick={() => setAsking(true)}>let it go</button>
            </>
          )}
        </SheetFoot>
      </div>
    </Sheet>
  )
}

// ── placing one ─────────────────────────────────────────────────────────────
// The same two steps as the wall's composer, and deliberately the same two: a
// person who has just written a letter on the wall and registered has seen this
// shape ninety seconds ago, and a core service that introduces a third way of
// asking for a handle and a line is a second product.
//
// One question at a time. The step-two card used to sit faded under step one's
// field, which made the composer read as a form with a disabled section.
const MIN_BODY = 30
const MAX_BODY = 320

function Place({ bump, go, back }) {
  const [to, setTo] = useState('')
  const [body, setBody] = useState('')
  const [step, setStep] = useState(0)

  const h = normHandle(to)
  const already = pings().some((p) => p.handle === h)
  const ok = [validHandle(h) && !already, body.trim().length >= MIN_BODY]

  function next() {
    if (!ok[step]) return
    if (step === 0) { setStep(1); return }
    place({ handle: h, body })
    bump()
    go('orbit')
  }

  return (
    <Sheet onClose={back} tall labelledBy="wl-place-h">
      <div className="wl-sheet-in wl-write">
        <SheetHead onClose={back} lead={<Dots n={2} at={step} onGo={setStep} />} />

        <Label tone="dim" as="h2" id="wl-place-h" className="wl-write-lab">
          {step === 0 ? 'to' : 'and what you would have said'}
        </Label>

        {step === 0 ? (
          <div className="wl-write-step">
            <HandleField
              value={to} onChange={setTo} onSubmit={next}
              autoFocus size="lg" placeholder="theirhandle"
            />
            {/* A sentence, not a label. Set as a Label it came out uppercase,
                letterspaced and broken across two ragged mono lines under the
                one field on the screen — the exact fault `.wl-say` exists to
                stop. */}
            <p className="wl-say wl-write-note">
              {already
                ? 'you already have one standing to them.'
                : 'they are told nothing. not now, and not if they never name you back.'}
            </p>
          </div>
        ) : (
          <div className="wl-write-step">
            <Paper
              dateline={{ lead: dateline(NOW).lead, stamp: left(SPAN) }}
              crest={<Mark handle={h} size={28} />}
              tone={body.trim() ? '' : 'empty'}
            >
              <LetterField
                value={body} onChange={setBody} max={MAX_BODY} autoFocus
                placeholder="You said buses only come in pairs and I have been telling that joke for two years."
              />
            </Paper>
            <div className="wl-place-floor" aria-live="polite">
              <p className="wl-say">sixty days, and renewing is free.</p>
              {body.trim().length > 0 && body.trim().length < MIN_BODY && (
                <Label tone="dim">
                  {MIN_BODY - body.trim().length === 1
                    ? 'one more'
                    : `${MIN_BODY - body.trim().length} more`}
                </Label>
              )}
            </div>
          </div>
        )}

        <div className="wl-write-foot">
          {step === 1 && <Pill tone="ghost" onClick={() => setStep(0)}>a different name</Pill>}
          <Pill tone="light" onClick={next} disabled={!ok[step]}>
            {step === 0 ? 'next' : 'place it'}
          </Pill>
        </div>
      </div>
    </Sheet>
  )
}

// ── both places held ────────────────────────────────────────────────────────
// Reached only by a deep link: nothing on the surface offers to place a letter
// when there is nowhere to put one, because the free place IS the control and
// it does not exist in this state.
//
// There is no second door here and there is no mention of one. What the free
// product is — placing, matching, renewing, letting go — is all this screen
// has ever known about.
function Full({ held, bump, back }) {
  const [gone, setGone] = useState(null)

  return (
    <Sheet onClose={back} labelledBy="wl-full-h">
      <div className="wl-sheet-in wl-full">
        <SheetHead onClose={back} />
        <div className="wl-reveal-head">
          <Label tone="dim" as="h2" id="wl-full-h">both places are held</Label>
        </div>

        <div className="wl-full-list">
          {held.map((p) => (
            <div key={p.id} className={`wl-full-row${gone === p.id ? ' is-asking' : ''}`}>
              <Mark handle={p.handle} size={30} gauge={p.run} tone={p.state === 'lapsing' ? 'near' : ''} />
              <span className="wl-full-t">
                <span className="wl-row-handle">{atHandle(p.handle)}</span>
                <span className="wl-row-meta">{left(p.days)}</span>
              </span>
              {gone === p.id ? (
                <span className="wl-full-ask">
                  <button type="button" className="wl-mine" onClick={() => { release(p.id); bump() }}>
                    let it go
                  </button>
                  <button type="button" className="wl-quiet" onClick={() => setGone(null)}>keep</button>
                </span>
              ) : (
                <button type="button" className="wl-mine" onClick={() => setGone(p.id)}>free it</button>
              )}
            </div>
          ))}
        </div>

        <SheetFoot>
          <p className="wl-say">
            a letter lapses on its own after sixty days, and the place comes back then.
          </p>
          <button type="button" className="wl-quiet" onClick={back}>not yet</button>
        </SheetFoot>
      </div>
    </Sheet>
  )
}

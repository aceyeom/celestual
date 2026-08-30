// ── /beta/orbit — THE PRODUCT, STANDING ─────────────────────────────────────
//
// The service the wall exists to fill, and a DIFFERENT PLACE from the wall.
// It is reached from exactly one control — the tab at the bottom of the wall,
// which appears only once somebody has put a letter up — and it is the first
// point in the whole prototype where anybody has an identity at all.
//
// So it does not share the wall's furniture. No wall nav, no search over the
// names, no writing a letter from here: one control leaves, and everything
// else on the screen is about pings, which the wall has never heard of.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  WHAT WAS WRONG WITH THE FIRST ONE                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// It read as a dashboard, and three specific things made it one.
//
//   1  THE ONE ENORMOUS NUMBER WAS SET IN THE UI SANS. Every other screen in
//      this build gives its largest object to the Didone and its identifiers
//      to the mono. This screen gave its largest object to Inter Tight at
//      weight 600, which is the face every product on the web sets a metric
//      in. On a surface being judged for looking bought rather than made, it
//      was the single most generic moment in the tree.
//
//   2  THE COLOUR RATION WAS SPENT ON A CAPSULE READING "TODAY", beside a
//      date that already said so, while the one thing on the screen anybody
//      had to act on (a ping four days from lapsing) was competing with it in
//      the same orange forty pixels lower. Two saturated objects, and the
//      loud one was the decorative one.
//
//   3  NOTHING WAS BUILT. `place a ping` called go('orbit') from /beta/orbit,
//      which the router correctly refuses as a navigation to where you already
//      are — so the primary control on the core service did nothing at all.
//      There was no way to place, renew or let go of anything: three states
//      were drawn and none of them could be reached or left.
//
// And under all three, one structural problem: the hero and the ledger were
// two objects saying the same thing badly. The rings knew nothing about the
// rows, so the diagram was an illustration of space sitting on top of a list.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  WHAT IT IS NOW                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The reference's journey view, still, component for component — but every one
// of them now carries a quantity off the ledger rather than a mood:
//
//   reference                         here
//   ─────────────────────────────────────────────────────────────────────────
//   a body with rings and moons       you, one ring per ping, and the moon at
//                                     its TRUE position on the sixty days. A
//                                     ring closes and carries two moons when
//                                     the ping is mutual, because that is what
//                                     closed it. art.jsx `Orrery`.
//   the date, set enormous            the date, set enormous, IN THE DIDONE.
//                                     This product is sixty-day clocks and the
//                                     date is what they are counted from.
//   an accent capsule beside it       kept as composition, spent as a
//                                     hairline. The saturated object moved to
//                                     the ping that is running out, which is
//                                     the only thing here anybody has to do
//                                     something about.
//   rows: face, name, meta, capsule   rows: constellation WITH THE COUNTDOWN
//                                     DRAWN ON ITS OWN RING, handle, what the
//                                     ping is doing, and how long is left.
//   sections by day                   sections by state, and the empty slot is
//                                     a row rather than a sentence: two slots
//                                     is the whole of the product's scarcity
//                                     and it should be a thing you can see.
//
// Four sheets rise over it, and between them they are the entire core service:
// a mutual (both cards, together), a standing ping (renew, or let it go),
// the composer, and the slots-full door. All four are real inside the tab
// (orbit.js), so a ping placed at a demo table is still there after a reload
// and the ring for it is drawn at the front of its circuit.

import { useMemo, useReducer, useState } from 'react'
import {
  Display, Label, Pill, Close, Icon, PillTag,
  Row, Sheet, SheetHead, SheetFoot, Paper, Prose, HandleField, LetterField,
} from '../parts.jsx'
import { Orrery, Mark, Sparkle, Dots } from '../art.jsx'
import { TODAY, ME } from '../seed.js'
import { atHandle, dateline, normHandle, validHandle } from '../data.js'
import {
  pings, ping, slots, nextOpen, place, renew, release,
  since, left, NOW,
} from '../orbit.js'

// What each state says under the handle. One line, and it is about the PING
// rather than about the person: a ledger row that editorialises about somebody
// you named is the wrong object entirely.
const SAYS = {
  mutual: () => 'you were both looking',
  standing: () => 'nothing shows until they do',
  lapsing: () => 'renew it, or let it go',
}

export default function Core({ id, go, reduce }) {
  // ── why this counter exists ──
  // The ledger lives in store.js, which is a blob under a key and not a React
  // anything, so nothing re-renders when a mutation lands. Everywhere else on
  // this surface that did not matter: the wall's own writes are followed by a
  // route change, and the shell re-reads on every one of those.
  //
  // Here it matters, and it is exactly the shape of the bug the old screen
  // shipped. `let it go` on the slots-full sheet finishes with go('orbit',
  // 'place') from /beta/orbit/place, which the router correctly refuses as a
  // navigation to where you already are. The slot was freed, nothing
  // re-rendered, and the sheet went on saying both slots were taken over a
  // ledger that now had one.
  //
  // So every mutation on this surface is followed by `bump`, and the ledger is
  // read fresh on the render it causes. It is one integer and it is the reason
  // the four sheets can act on state without any of them owning it.
  const [beat, bump] = useReducer((n) => n + 1, 0)
  const [lit, setLit] = useState(null)
  // `beat` is a real dependency rather than a comment about one: the ledger is
  // re-read on the render a mutation causes, and on a route change.
  const rows = useMemo(() => pings(), [beat, id])
  const slot = useMemo(() => slots(), [beat, id])

  const mutual = rows.filter((p) => p.state === 'mutual')
  const held = rows.filter((p) => p.state !== 'mutual')
  const lapsing = held.find((p) => p.state === 'lapsing')

  // Which sheet, if any. The second path segment is either a ping's id or the
  // literal `place`, so every state of this surface has an address and none of
  // them needs a route the wall does not already have.
  const open = id && id !== 'place' ? ping(id) : null
  const back = () => go('orbit')

  return (
    <>
      <div className="wl-page wl-core">
        {/* The core service's own bar. One control leaves — back to the wall —
            and the rest of it is this account, which is a thing the wall does
            not have and will never ask for. */}
        <header className="wl-top">
          <div className="wl-top-mark">
            <Mark handle={ME} size={30} lit />
            <Label><span className="wl-h">{atHandle(ME)}</span></Label>
          </div>
          <Close onClick={() => go('wall')} label="back to the wall" />
        </header>

        <div className="wl-core-left">
          {/* ── the hero ──
              It bleeds past both edges on purpose. The reference lets its ring
              system run off the screen, and that is what stops it reading as a
              piece of clip art dropped into a card.

              `rows` arrives innermost-first (orbit.js sorts mutual, then by
              what is closest to running out), so ring N is row N and lighting
              one from the list below is an id match rather than an index
              somebody has to keep in sync. */}
          <div className="wl-core-sky">
            <Orrery size={470} rings={rows} lit={lit} className="wl-core-orrery" />
          </div>

          {/* ── the date ──
              The reference sets it enormous with one capsule beside it, and
              both are kept. The capsule is a hairline rather than the accent:
              "today" is not news, and the ration is spent forty pixels below
              on the ping that is nearly out of days. */}
          <div className="wl-core-date">
            <div className="wl-core-date-t">
              <Display size="xl" as="p" className="wl-core-day">{TODAY.label}</Display>
              <Label tone="dim">{TODAY.day}</Label>
            </div>
            <PillTag tone="ghost" className="wl-core-today">today</PillTag>
          </div>
        </div>

        <div className="wl-core-right">
          {mutual.length > 0 && (
            <section className="wl-sect">
              <div className="wl-sect-head">
                <Label><Sparkle size={11} twinkle={!reduce} /> mutual</Label>
              </div>
              {mutual.map((p) => (
                <Row
                  key={p.id} lit
                  mark={<Mark handle={p.handle} size={36} lit tone="mutual" gauge={1} />}
                  handle={p.handle}
                  meta={SAYS.mutual()}
                  action={<PillTag tone="light">open</PillTag>}
                  onClick={() => go('orbit', p.id)}
                  onEnter={() => setLit(p.id)} onLeave={() => setLit(null)}
                />
              ))}
            </section>
          )}

          <section className="wl-sect">
            <div className="wl-sect-head">
              <Label>standing</Label>
              <Label tone="dim">{slot.held} of {slot.cap}</Label>
            </div>

            {held.map((p) => (
              <Row
                key={p.id}
                tone={p.state}
                mark={<Mark handle={p.handle} size={36} gauge={p.run} tone={p.state === 'lapsing' ? 'near' : ''} />}
                handle={p.handle}
                meta={SAYS[p.state](p)}
                action={<span className="wl-days">{left(p.days)}</span>}
                onClick={() => go('orbit', p.id)}
                onEnter={() => setLit(p.id)} onLeave={() => setLit(null)}
              />
            ))}

            {/* An open slot is a row, not a sentence. Two slots is the entire
                scarcity mechanism of this product, and a person who has to
                read a number to find out they have one left has been told
                about it rather than shown it. */}
            {Array.from({ length: slot.open }).map((_, i) => (
              <button
                key={`open${i}`} type="button" className="wl-open"
                onClick={() => go('orbit', 'place')}
              >
                <span className="wl-open-mark" aria-hidden="true" />
                <span className="wl-open-t">open slot</span>
                <span className="wl-open-a">place one</span>
              </button>
            ))}
          </section>

          {/* The one line of housekeeping on the screen, and it only appears
              when it is load-bearing: a slot you are waiting on has a date,
              and a locked door with no date on it is not scarcity. */}
          {slot.full && (
            <p className="wl-say wl-core-note">
              {nextOpen() === 0
                ? 'your next slot opens today.'
                : `your next slot opens in ${nextOpen()} days, or the moment you let one go.`}
            </p>
          )}
        </div>

        <div className="wl-push" />

        <div className="wl-dock">
          <div className="wl-dock-veil" aria-hidden="true" />
          <div className="wl-dock-in">
            <Pill
              tone="light" wide icon={<Icon name="join" size={17} />}
              onClick={() => go('orbit', 'place')}
            >
              place a ping
            </Pill>
          </div>
        </div>
      </div>

      {id === 'place' && (slot.full
        ? <Full held={held} lapsing={lapsing} bump={bump} back={back} />
        : <Place bump={bump} go={go} back={back} />)}
      {open && open.state === 'mutual' && <Reveal ping={open} back={back} reduce={reduce} />}
      {open && open.state !== 'mutual' && <Standing ping={open} go={go} bump={bump} back={back} />}
    </>
  )
}

// ── the reveal ──────────────────────────────────────────────────────────────
// A mutual is two cards, and the only moment in the entire product where both
// of them are readable. So they are shown TOGETHER, one above the other, on
// the same sheet — never one at a time behind a tab or a button, because the
// simultaneity is the thing that happened and any control between them takes
// it away. The second card rises 220ms behind the first (wall.css), which is
// the reveal: two cards that were already there would be a page.
//
// Both are dated off this surface's own clock (orbit.js NOW) and they are
// dated DIFFERENTLY, because a sixty-day mechanism whose two halves carry the
// same date is claiming the pair was written in one morning.
function Reveal({ ping: p, back, reduce }) {
  return (
    <Sheet onClose={back} tall labelledBy="wl-reveal-h">
      <div className="wl-sheet-in wl-reveal">
        <SheetHead onClose={back} />
        <div className="wl-reveal-head">
          <Display size="s" as="h2" id="wl-reveal-h">You were both looking.</Display>
          <Label tone="dim">
            <span className="wl-h">{atHandle(p.handle)}</span> · placed {since(p.placedAt)}
          </Label>
        </div>

        <div className="wl-pairpaper is-open">
          <Paper
            dateline={dateline(p.placedAt)}
            crest={<Mark handle={p.handle} size={30} lit />}
            title={<span className="wl-letter-to">{atHandle(p.handle)}</span>}
          >
            <Prose>{p.yours}</Prose>
          </Paper>

          <div className="wl-pairpaper-join" aria-hidden="true">
            <Sparkle size={16} twinkle={!reduce} />
          </div>

          <Paper
            dateline={dateline(p.answeredAt)}
            crest={<Mark handle={ME} size={30} lit />}
            title={<span className="wl-letter-to">{atHandle(ME)}</span>}
            tone="theirs"
          >
            <Prose>{p.theirs}</Prose>
          </Paper>
        </div>

        <SheetFoot>
          <p className="wl-say">
            shown to the two of you and to nobody else. a pair that has closed
            is not waiting on anybody, so it holds no slot.
          </p>
        </SheetFoot>
      </div>
    </Sheet>
  )
}

// ── a ping, standing ───────────────────────────────────────────────────────
// One card, yours, and the two things a person can actually do with it. They
// are set at different weights on purpose: renewing is free, reversible and
// the thing most people want, and letting go is the only irreversible act on
// this surface. A pair of matched buttons would say those are the same size
// of decision.
//
// ── the confirmation does not replace the letter ───────────────────────────
// `let it go` swaps the FOOT and nothing else. It first swapped the whole
// sheet for a heading and two buttons, which took the card off the screen at
// exactly the moment somebody was deciding whether to destroy it: the words
// they wrote, to the person they wrote them to, are the entire content of the
// decision, and asking "are you sure" over a blank sheet asks them to trust
// their memory instead of their eyes. It is the same rule the report sheet on
// the wall is built on, and this screen was breaking it.
function Standing({ ping: p, go, bump, back }) {
  const [asking, setAsking] = useState(false)
  const [done, setDone] = useState(false)
  const near = p.state === 'lapsing'

  return (
    <Sheet onClose={back} tall labelledBy="wl-standing-h">
      <div className="wl-sheet-in wl-reveal">
        <SheetHead onClose={back} />
        <div className="wl-reveal-head">
          <Display size="s" as="h2" id="wl-standing-h">
            {asking ? 'Let it go?' : done ? 'Sixty more days.' : near ? 'Nearly out of days.' : 'Still standing.'}
          </Display>
          <Label tone="dim">
            <span className="wl-h">{atHandle(p.handle)}</span> · placed {since(p.placedAt)}
          </Label>
        </div>

        <div className="wl-pairpaper">
          <Paper
            dateline={dateline(p.placedAt)}
            crest={<Mark handle={p.handle} size={30} gauge={p.run} tone={near ? 'near' : ''} />}
            title={<span className="wl-letter-to">{atHandle(p.handle)}</span>}
          >
            <Prose>{p.yours}</Prose>
          </Paper>
        </div>

        {/* The clock, drawn once, at the width of the card it belongs to. The
            row upstairs says the number in words; this says it as a distance,
            which is the only way a person feels what fifty-two days out of
            sixty is.

            Two short counts sit on the rule above it and the honest sentence
            sits under it in prose. They were one line with a count at each
            end, and the right-hand one was a whole sentence set in
            letterspaced uppercase mono: eight words, running the width of the
            sheet, shouting, in the face this build reserves for identifiers. */}
        {/* Nothing here is derived from `done`. Renewing writes through
            orbit.js and bumps the ledger, so the ping this sheet is handed on
            the next render is the renewed one: the bar empties, the crest's
            gauge resets, `near` goes false and the dateline moves to today,
            all off the same read. `done` decides two words and a disabled
            state, which is all it should ever have decided. */}
        <div className="wl-run-head">
          <Label tone="dim">{p.spent === 0 ? 'just placed' : `day ${p.spent} of sixty`}</Label>
          <Label tone="dim">{left(p.days)} left</Label>
        </div>
        <div className={`wl-run-bar${near ? ' is-near' : ''}`} aria-hidden="true">
          <span style={{ width: `${Math.min(100, p.run * 100).toFixed(1)}%` }} />
        </div>
        <p className="wl-say wl-run-say">
          {asking
            ? 'the line comes off the ledger and the slot opens back up. nothing is kept, and no desk can put it back.'
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
                {done ? 'renewed' : 'renew'}
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
// The same two steps as the wall's composer, and deliberately the same two:
// a person who has just written a letter on the wall and registered has seen
// this shape ninety seconds ago, and a core service that introduces a third
// way of asking for a handle and a line is a second product.
//
// What is different is what it says, and it is the whole difference between
// the two surfaces. A letter goes up in public with nobody's name on it. A
// ping goes nowhere: it is held, it is shown to no one, and it becomes visible
// to exactly one person only if that person has already done the same thing.
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

        <Display size="s" as="h2" id="wl-place-h" className="wl-write-h">
          {step === 0
            ? <>Someone you want<br />to hear back from.</>
            : <>And what you<br />would have said.</>}
        </Display>

        {step === 0 ? (
          <div className="wl-write-step">
            <HandleField
              value={to} onChange={setTo} onSubmit={next}
              autoFocus size="lg" placeholder="theirhandle"
            />
            <Label tone="dim" className="wl-write-note">
              <Sparkle size={9} />{' '}
              {already
                ? 'you already have one standing to them'
                : 'they are told nothing. not now, and not if they never ping you back'}
            </Label>
          </div>
        ) : (
          <div className="wl-write-step">
            <Paper
              dateline={dateline(NOW)}
              crest={<Mark handle={h} size={30} />}
              title={<span className="wl-letter-to">{atHandle(h)}</span>}
              tone={body.trim() ? '' : 'empty'}
            >
              <LetterField
                value={body} onChange={setBody} max={MAX_BODY} autoFocus
                placeholder="You said buses only come in pairs and I have been telling that joke for two years."
              />
            </Paper>
            {/* The terms on the left, the count on the right. Both used to be
                Labels, which put "sixty days. renewing is free and takes no
                slot." on the wall's count row: a sentence, uppercased,
                letterspaced, wrapped to two ragged lines and hard against the
                right edge. */}
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

// ── both slots taken ────────────────────────────────────────────────────────
// Not an error and not a wall. The slots are the product's one scarcity, and
// this is the screen where that scarcity is felt — so it says what is in them,
// and it puts the way out on each one rather than sending somebody back to the
// ledger to work out which line to remove.
//
// There is no second door here. Production carries one behind a flag (a third
// slot, bought once) and this prototype deliberately does not draw it: the
// free product is placing, matching, renewing and letting go, and a beta that
// shows somebody a price before it has shown them a mutual has taught them the
// wrong thing about what this is.
function Full({ held, lapsing, bump, back }) {
  const [gone, setGone] = useState(null)

  return (
    <Sheet onClose={back} labelledBy="wl-full-h">
      <div className="wl-sheet-in wl-full">
        <SheetHead onClose={back} />
        <div className="wl-reveal-head">
          <Display size="s" as="h2" id="wl-full-h">Both slots are taken.</Display>
          <p className="wl-say wl-full-sub">each one costs something. that is the point of two.</p>
        </div>

        <div className="wl-full-list">
          {held.map((p) => (
            <div key={p.id} className={`wl-full-row${gone === p.id ? ' is-asking' : ''}`}>
              <Mark handle={p.handle} size={34} gauge={p.run} tone={p.state === 'lapsing' ? 'near' : ''} />
              <span className="wl-full-t">
                <span className="wl-row-handle">{atHandle(p.handle)}</span>
                <span className="wl-row-meta">{left(p.days)}</span>
              </span>
              {gone === p.id ? (
                <span className="wl-full-ask">
                  {/* No navigation: this sheet is already AT /beta/orbit/place.
                      Freeing a slot changes what that address renders, from
                      this door to the composer behind it, and `bump` is what
                      makes the surface notice. */}
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
            {lapsing ? (
              <>
                <span className="wl-h">{atHandle(lapsing.handle)}</span> lapses on
                its own in {lapsing.days} days, and the slot comes back then.
              </>
            ) : 'a ping lapses on its own after sixty days, and the slot comes back then.'}
          </p>
          <button type="button" className="wl-quiet" onClick={back}>not yet</button>
        </SheetFoot>
      </div>
    </Sheet>
  )
}

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
// This screen is the reference's journey view rebuilt on the product's own
// meaning, component for component, and the mapping is worth writing down
// because every one of them earns its place:
//
//   reference                         here
//   ─────────────────────────────────────────────────────────────────────────
//   a body with rings and moons       you, and one ring per standing ping.
//                                     A ring closes and its moon lights only
//                                     when that ping is mutual — so the hero
//                                     is a live readout of the mechanism and
//                                     not an illustration of space.
//   the date, set enormous            the date, set enormous. This product is
//                                     sixty-day clocks; the date is the most
//                                     load-bearing number in it.
//   an accent capsule beside it       "today", and it is the ONLY saturated
//                                     object on the screen. One per screen,
//                                     always on the thing that is true now.
//   rows: face, name, meta, capsule   rows: constellation, handle, what the
//                                     ping is doing, and the door into it.
//   sections by day                   sections by state: mutual, standing,
//                                     lapsing. A ping's state is the only
//                                     thing anybody opens this screen to read.
//
// The ledger is populated (seed.js LEDGER) because a ledger screen with one
// row in it cannot be judged: the whole question is whether three states read
// as different at a glance, and that needs three states on the glass.

import { useMemo, useState } from 'react'
import {
  Display, Label, Pill, ArrowLink, Rule, Icon,
  Row, Sheet, Paper, Prose, PillTag,
} from '../parts.jsx'
import { Orbit, Mark, Sparkle, Halftone } from '../art.jsx'
import { LEDGER, TODAY, ME } from '../seed.js'
import { atHandle, dateline, hash, DAY } from '../data.js'
import { getState } from '../store.js'

const STATE_COPY = {
  mutual:   { meta: () => 'you were both looking' },
  standing: { meta: (p) => `${p.days} days left` },
  lapsing:  { meta: (p) => `${p.days} days left · renew or let it go` },
}

// One ring per ping, sized so the outermost is the one closest to lapsing —
// a ring running out of room, which is the same thing the number says.
function ringsFor(pings) {
  return pings.map((p, i) => ({
    rx: 22 + i * 11,
    closed: p.state === 'mutual',
    fading: p.state === 'lapsing',
    period: 26 + i * 9,
    phase: (hash(p.handle) % 100) / 100,
    moon: p.state === 'mutual' ? 2.4 : 1.8,
  }))
}

export default function Core({ id, go, reduce }) {
  const me = ME
  const mine = getState().written
  const rings = useMemo(() => ringsFor(LEDGER), [])
  const open = LEDGER.find((p) => p.id === id) || null

  const mutual = LEDGER.filter((p) => p.state === 'mutual')
  const rest = LEDGER.filter((p) => p.state !== 'mutual')

  return (
    <>
      <div className="wl-page wl-core">
        {/* The core service's own bar. One control leaves — back to the wall —
            and the rest of it is this account, which is a thing the wall does
            not have and will never ask for. */}
        <header className="wl-top">
          <div className="wl-top-mark">
            <span className="wl-me">
              <Mark handle={me} size={32} lit />
              {mutual.length > 0 && <i className="wl-me-dot" aria-hidden="true" />}
            </span>
            <Label><span className="wl-h">{atHandle(me)}</span></Label>
          </div>
          <button type="button" className="wl-iconbtn" onClick={() => go('wall')}
            aria-label="back to the wall" title="the wall">
            <Icon name="wall" />
          </button>
        </header>

        <div className="wl-core-left">
        {/* ── the hero ──
            It bleeds past both edges on purpose. The reference lets its ring
            system run off the screen, and that is what stops it reading as a
            piece of clip art dropped into a card. */}
        <div className="wl-core-sky">
          <Orbit size={350} rings={rings} still={reduce} className="wl-core-orbit" />
          <Halftone size={64} grid={16} className="wl-core-ball" />
        </div>

        {/* ── the date ── */}
        <div className="wl-core-date">
          <div>
            <p className="wl-bignum">{TODAY.label}</p>
            <Label tone="dim">{TODAY.day}</Label>
          </div>
          <Pill tone="ember">today</Pill>
        </div>

        </div>

        <div className="wl-core-right">
        {/* ── mutual ── */}
        {mutual.length > 0 && (
          <section className="wl-sect">
            <div className="wl-sect-head">
              <Label><Sparkle size={11} twinkle={!reduce} /> mutual</Label>
            </div>
            {mutual.map((p) => (
              <Row
                key={p.id} lit
                mark={<Mark handle={p.handle} size={36} lit />}
                handle={p.handle}
                meta={STATE_COPY.mutual.meta()}
                action={<PillTag tone="light" icon={<span className="wl-play" />}>open</PillTag>}
                onClick={() => go('orbit', p.id)}
              />
            ))}
          </section>
        )}

        {/* ── standing ── */}
        <section className="wl-sect">
          <div className="wl-sect-head">
            <Label>standing</Label>
            <Label tone="dim">{rest.length} of 2 slots</Label>
          </div>
          {rest.map((p) => (
            <Row
              key={p.id}
              tone={p.state}
              mark={<Mark handle={p.handle} size={36} />}
              handle={p.handle}
              meta={STATE_COPY[p.state].meta(p)}
              action={<PillTag tone="ghost" icon={<span className="wl-play" />}>card</PillTag>}
              onClick={() => go('orbit', p.id)}
            />
          ))}
        </section>

        </div>

        <div className="wl-push" />

        <div className="wl-dock">
          <div className="wl-dock-veil" aria-hidden="true" />
          <div className="wl-dock-in">
            <Pill tone="light" wide icon={<Icon name="join" size={17} />} onClick={() => go('orbit')}>
              place a ping
            </Pill>
          </div>
        </div>
      </div>

      {open && <Reveal ping={open} me={me} back={() => go('orbit')} reduce={reduce} />}
    </>
  )
}

// ── the reveal ──────────────────────────────────────────────────────────────
// A mutual is two cards, and the only moment in the entire product where both
// of them are readable. So they are shown TOGETHER, one above the other, on
// the same sheet — never one at a time behind a tab, because the simultaneity
// is the thing that happened and a tabbed interface would take it away.
//
// A ping that is not mutual shows one card: yours, still sealed to them.
function Reveal({ ping, me, back, reduce }) {
  const [flipped, setFlipped] = useState(reduce || ping.state !== 'mutual')
  const isMutual = ping.state === 'mutual'
  // A ping stands sixty days, so `days` remaining dates the card it rides on.
  // Both cards showing today's date would say the pair was written this
  // morning, which is the one thing a sixty-day mechanism must never imply.
  const placedAgo = 60 - ping.days
  const dlYours = dateline(Date.now() - placedAgo * DAY)
  const dlTheirs = dateline(Date.now() - Math.round(placedAgo / 2) * DAY)

  return (
    <Sheet onClose={back} tall labelledBy="wl-reveal-h">
      <div className="wl-sheet-in wl-reveal">
        <div className="wl-reveal-head">
          <Display size="s" as="h2" id="wl-reveal-h">
            {isMutual ? 'You were both looking.' : 'Still standing.'}
          </Display>
          <Label tone="dim"><span className="wl-h">{atHandle(ping.handle)}</span> · {ping.placed}</Label>
        </div>

        <div className={`wl-pairpaper${flipped ? ' is-open' : ''}`}>
          <Paper dateline={dlYours} title={<span className="wl-letter-to">{atHandle(ping.handle)}</span>}>
            <Prose>{ping.yours}</Prose>
          </Paper>

          {/* Theirs is not in the document until it is read. A card sitting
              hidden behind a class is a card somebody can read with a devtools
              toggle, and the whole claim of this screen is that the second one
              did not exist for either of you until the pair closed. */}
          {isMutual && flipped && (
            <>
              <div className="wl-pairpaper-join" aria-hidden="true">
                <Sparkle size={16} twinkle={!reduce} />
              </div>
              <Paper dateline={dlTheirs} title={<span className="wl-letter-to">{atHandle(me)}</span>} tone="theirs">
                <Prose>{ping.theirs}</Prose>
              </Paper>
            </>
          )}
        </div>

        {!flipped && (
          <Pill tone="light" wide onClick={() => setFlipped(true)}>read both</Pill>
        )}

        <div className="wl-reveal-foot">
          {!isMutual && <Label tone="dim">{ping.days} days left · they have not written yours</Label>}
          <ArrowLink tone="quiet" onClick={back}>close</ArrowLink>
        </div>
      </div>
    </Sheet>
  )
}

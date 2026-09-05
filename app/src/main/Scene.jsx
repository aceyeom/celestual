// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE SCENE                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The hero's one object, and what stands where the logo used to.
//
// The first hero put the mark on the page at four hundred pixels, taken apart
// into two orbits that swung back together every nine seconds. It was a good
// drawing of the idea and a bad front door: a person who has never heard of
// this product saw an enormous logo doing a trick, and had to read the
// paragraph to find out what the trick was about.
//
// This is the product instead. Two cards, one from each side, both sealed. A
// ping is a sealed card with a name on it, and the only thing that can open it
// is the same card placed back, so the scene is that: the cards are shut, the
// mark above them is dim, and then it is mutual, the words come up on both at
// once, and the mark lights. Then they seal again, because until it happens
// that is the state they are in.
//
// ── the sequence, in beats ──────────────────────────────────────────────────
// It used to be one cross fade: the class flipped and every property on both
// cards moved at once, over the same 900ms, with the bars and the words at two
// different line heights so the card changed height under the swap. That is
// what read as a glitch. Now the opening is a sequence, and the order is the
// meaning:
//
//   0    the cards arrive, one from each side, and settle sealed
//   1    the mark lights. That is the event, so it moves first
//   2    a shadow crosses each card, the way a page turns to the light
//   3    the bars dissolve where the shadow has passed and the words come
//        up in their place, the same words, on the same lines
//   4    the stamp is struck: sealed becomes mutual, with a small press
//   then it holds long enough to be read, and seals again quietly, without
//   the shadow, because a seal is not an event
//
// Every beat is CSS keyed off two classes on the scene and one on the stamp;
// this file only keeps the clock. The bars are set at the words' own size, so
// the card is the same height shut and open and nothing under it moves.
//
// Every piece is the system's own. The cards are `Paper`, the same card a ping
// is actually written on; the redaction is `Redacted`, built out of the real
// words so the shape of the sealed card is the shape of the open one; the mark
// is the material the intro pours, at the size of a seal.
//
// The two lines are the two lines the reveal is screenshotted with and the one
// the composer offers as its example. They are examples and the caption under
// the scene says so: no handle, no name, no date, no number, because a front
// door that fakes activity is the pattern this product exists to not be.
//
// Under prefers-reduced-motion it is drawn open and still: the composed frame,
// not an empty one.

import { useEffect, useState } from 'react'
import { Paper, Prose, Redacted } from '../wall/parts.jsx'
import LiquidMark from '../wall/LiquidMark.jsx'

const YOU = 'i have wanted to say this since the second week of term.'
const THEM = 'i kept nearly saying something after class and then not saying it.'

// The beats. Shut while the page enters, open for long enough to be read, shut
// for long enough to register as shut, and round again. The stamp is struck
// a little after the shadow has crossed the card.
const ENTER = 1700
const OPEN = 6200
const SHUT = 2800
const STAMP = 760

function Card({ who, text, className, stamp }) {
  return (
    <div className={`hm-scene-slot ${className}`}>
      <Paper
        className="hm-scene-card"
        dateline={{ lead: who, stamp }}
        aria-hidden="true"
      >
        <div className="hm-scene-body">
          <div className="hm-scene-open"><Prose>{text}</Prose></div>
          <div className="hm-scene-shut"><Redacted text={text} /></div>
        </div>
      </Paper>
    </div>
  )
}

export default function Scene({ still = false }) {
  const [open, setOpen] = useState(still)
  // The word on the stamp lags the opening by the time the shadow takes to
  // cross the card, so the strike lands where the eye already is.
  const [stamp, setStamp] = useState(still ? 'mutual' : 'sealed')

  useEffect(() => {
    if (still) return undefined
    let timer = 0
    let strike = 0
    const cycle = (next) => {
      setOpen(next)
      clearTimeout(strike)
      if (next) strike = setTimeout(() => setStamp('mutual'), STAMP)
      else setStamp('sealed')
      timer = setTimeout(() => cycle(!next), next ? OPEN : SHUT)
    }
    timer = setTimeout(() => cycle(true), ENTER)
    return () => { clearTimeout(timer); clearTimeout(strike) }
  }, [still])

  return (
    <div
      className={`hm-scene${open ? ' is-open' : ' is-shut'}${still ? ' is-still' : ''}`}
      role="img"
      aria-label="two sealed cards, one from each of you. when both are placed they open at once and the mark lights."
    >
      {/* The mark as a material. Sealed, the metal barely moves; mutual, the
          current runs. The same object the intro poured, at the size of a
          seal rather than a screen. */}
      <div className="hm-scene-mark">
        <LiquidMark size={66} speed={open ? 0.8 : 0.12} still={still} />
      </div>
      <Card who="you" text={YOU} className="hm-scene-a" stamp={stamp} />
      <Card who="them" text={THEM} className="hm-scene-b" stamp={stamp} />
    </div>
  )
}

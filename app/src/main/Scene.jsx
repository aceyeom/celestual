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
// Every piece is the system's own. The cards are `Paper`, the same card a ping
// is actually written on; the redaction is `Redacted`, built out of the real
// words so the shape of the sealed card is the shape of the open one; the mark
// is `Ecliptic`, from the same nine constants as the favicon.
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
import { ECL, ringPath, starPath } from '../wall/art.jsx'
import LiquidMark from './LiquidMark.jsx'

const YOU = 'i have wanted to say this since the second week of term.'
const THEM = 'i kept nearly saying something after class and then not saying it.'

// The beats. Shut while the page enters, open for long enough to be read, shut
// for long enough to register as shut, and round again.
const ENTER = 1500
const OPEN = 5600
const SHUT = 2600

function Card({ who, text, className, open }) {
  return (
    <Paper
      className={`hm-scene-card ${className}`}
      dateline={{ lead: who, stamp: open ? 'mutual' : 'sealed' }}
      aria-hidden="true"
    >
      <div className="hm-scene-body">
        <div className="hm-scene-open"><Prose>{text}</Prose></div>
        <div className="hm-scene-shut"><Redacted text={text} /></div>
      </div>
    </Paper>
  )
}

export default function Scene({ still = false }) {
  const [open, setOpen] = useState(still)

  useEffect(() => {
    if (still) return undefined
    let timer = 0
    const cycle = (next) => {
      setOpen(next)
      timer = setTimeout(() => cycle(!next), next ? OPEN : SHUT)
    }
    timer = setTimeout(() => cycle(true), ENTER)
    return () => clearTimeout(timer)
  }, [still])

  return (
    <div
      className={`hm-scene${open ? '' : ' is-shut'}`}
      role="img"
      aria-label="two sealed cards, one from each of you. when both are placed they open at once and the mark lights."
    >
      {/* The mark as a material. Sealed, the metal barely moves; mutual, the
          current runs. The same object the intro poured, at the size of a
          seal rather than a screen. */}
      <div className="hm-scene-mark">
        <LiquidMark size={66} speed={open ? 0.8 : 0.12} still={still} />
      </div>
      <Card who="you" text={YOU} className="hm-scene-a" open={open} />
      <Card who="them" text={THEM} className="hm-scene-b" open={open} />
    </div>
  )
}

// ── the mark's states, for the ledger ───────────────────────────────────────
// Three drawings from the mark's own geometry, standing beside the three steps
// of how it works. One ring with the star unlit: a ping placed. Two rings apart:
// both placed, neither told. And the mark itself, which the third step draws
// with `Ecliptic` directly, because at that point it is the logo and nothing
// less.
//
// 46 degrees is the spread Alignment.jsx settled on: at that angle the two
// bands cross near the ends of the long axis, where each is at its widest, so
// they read as two objects rather than one thick one.
const RING = ringPath()
const STAR = starPath(ECL)

export function Orbits({ state = 0, size = 52, className = '' }) {
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 100 100"
      aria-hidden="true" focusable="false"
    >
      {state === 0 ? (
        <>
          <path d={RING} fill="currentColor" fillRule="evenodd" />
          <path d={STAR} transform="translate(50 50)" fill="currentColor" opacity="0.22" />
        </>
      ) : (
        <>
          <g transform="rotate(46 50 50)" opacity="0.5">
            <path d={RING} fill="currentColor" fillRule="evenodd" />
          </g>
          <path d={RING} fill="currentColor" fillRule="evenodd" />
        </>
      )}
    </svg>
  )
}

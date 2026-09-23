// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE ART                                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Every ornament in this build is drawn here, from a path or a loop, and there
// is not one downloaded asset, icon set or stock illustration in the tree. Two
// reasons, and only the second one is about taste:
//
//   1. Everything here is derived from a handle. The constellation beside a
//      name is that name's hash and nobody else's; the sphere's shading and
//      the field's drift come out of the same function. An icon set cannot do
//      that, because an icon set does not know what it is next to.
//   2. This brand is being judged against a reference that is entirely
//      geometry and type — a sparkle, a dotted sphere, a ring system, a blur.
//      Those five things are cheap to draw and impossible to buy without
//      looking like everybody else who bought them.
//
// The five primitives, and where the reference puts each one:
//   Sparkle    the four-point star, top-right of the poster and beside the title
//   Halftone   the dotted sphere in the poster's bottom corner (kept; the
//              wall's masthead carries the Campanile now, below)
//   Orrery     the ring system the journey screen opens on, rebuilt as a
//              readout: one ring per ping, and the moon is where the clock is
//   Bloom      the soft blurred mass the modal is built around
//   Mark       the constellation that stands where the reference puts a face
//
// And one thing that is not an ornament at all: ECLIPTIC, the mark. It is built
// out of the same SPARK curve as the sparkle above, which is asserted rather
// than asserted-in-a-comment — see the check at the end of its section.

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { hash, rand } from './data.js'

// ── the four-point star ─────────────────────────────────────────────────────
// The points are joined by curves that bow INWARD toward the centre, which is
// the whole difference between a sparkle and a plus sign. The control points
// sit at 30% along each arm: pull them to 45% and it becomes a diamond, drop
// them to 15% and it becomes a cross. 30% is the reference.
const SPARK = 'M50 0C51.5 29 62 40.5 100 50C62 59.5 51.5 71 50 100C48.5 71 38 59.5 0 50C38 40.5 48.5 29 50 0Z'

export function Sparkle({ size = 18, tone = 'chalk', twinkle = false, delay = 0, className = '', style }) {
  return (
    <svg
      className={`wl-spark${twinkle ? ' is-twinkle' : ''} ${className}`}
      style={{ '--spark-delay': `${delay}ms`, ...style }}
      width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false"
    >
      <path d={SPARK} fill={tone === 'ember' ? 'var(--ember)' : tone === 'ink' ? 'var(--paper-ink)' : 'currentColor'} />
    </svg>
  )
}

// ── the verified seal ───────────────────────────────────────────────────────
// Instagram's badge, drawn here from twelve lobes and a check, because that is
// what the badge means and a four point sparkle does not mean it. The sparkle
// stood here for a while and it was this product's own mark doing another
// service's job: on a row about somebody's Instagram account, the thing beside
// their name is a claim about THAT account, and it has to be legible as that
// service's claim rather than as our ornament.
//
// It is still ours to draw. Twelve lobes on one radius and twelve valleys on
// another, a quadratic between each pair, so the seal comes off the same kind
// of numbers as everything else in this file and there is no icon set in the
// build (DESIGN.md 1.3).
//
// It is struck in `--accent` and not in Instagram's blue: section 2 says
// nothing outside the tokens names a hue, and the SHAPE is what says whose
// badge this is. `ink` is the ground the check is cut in, since a check inside
// a filled seal is the ground showing through — every caller today is on the
// void, and a caller on paper passes its own.
const SEAL = (() => {
  const n = 12
  const tip = 50   // how far out a lobe reaches
  const cut = 39   // and how far in the valley between two of them comes
  const at = (a, r) => [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]
  const turn = (i) => (i / n) * Math.PI * 2 - Math.PI / 2
  // The control point sits further out than the lobe itself: a quadratic
  // through its own peak would only reach halfway to it.
  const pull = tip + (tip - cut) * 0.9
  let d = `M ${at(turn(0.5), cut).map((v) => v.toFixed(2)).join(' ')}`
  for (let i = 1; i <= n; i++) {
    const c = at(turn(i - 0.5 + 0.5), pull)
    const e = at(turn(i + 0.5), cut)
    d += ` Q ${c[0].toFixed(2)} ${c[1].toFixed(2)} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`
  }
  return `${d} Z`
})()

const SEAL_CHECK = 'M34.5 50.5 45 61 66 39.5'

export function Verified({ size = 13, ink = 'var(--void-1)', className = '', label = 'verified on instagram' }) {
  return (
    <svg
      className={`wl-verified ${className}`}
      width={size} height={size} viewBox="0 0 100 100"
      role="img" aria-label={label}
      focusable="false"
    >
      <path d={SEAL} fill="currentColor" />
      <path d={SEAL_CHECK} fill="none" stroke={ink} strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── the flaps ───────────────────────────────────────────────────────────────
// The count on the masthead, on split flaps. The lanes under it already move
// at the speed of a departures board, and this is that board's number: one
// flap per digit, the digit in the identifier face in the campus's gold, on a
// plate of the void with a seam across its middle. When the number changes
// the top half of the old digit folds down over the bottom half of the new
// one, which is the whole of the mechanism and the only motion here.
//
// On the opening every digit rolls through a few figures before it lands,
// the ones column further than the tens the way an odometer turns; after
// that a flap moves only when a letter goes up, so a flap moving means one
// did. Under reduced motion nothing rolls and nothing folds: the number is
// simply there.
//
// The figure is read as one number and not as four halves: the digits carry
// an aria-label and the halves are hidden from the tree.
// the fold itself is timed in wall.css (two halves of 130ms); this is the
// beat between one figure landing and the next one leaving
// One fold, and the pause after it. FLAP_MS is the two halves of the CSS
// animation end to end (130ms down, 130ms in), and the sequence is driven off
// these rather than off `animationend`.
//
// It used to wait for the event, and a flap that never got one stopped where
// it stood: a browser does not restart an animation whose class was taken off
// and put back inside one frame, so under load the roll could stall halfway
// and leave a number on the masthead that was not the number of letters on
// the wall. A count this product shows is exactly accurate or it is absent
// (design/VOICE.md section 4), and a stalled flap is neither. On a timer the
// figure is always the one the server sent, whether or not the fold is drawn.
const FLAP_MS = 260
const FLAP_GAP = 40
const mod10 = (d) => ((d % 10) + 10) % 10

function FlapDigit({ digit, roll = 0, delay = 0 }) {
  const first = roll > 0 ? mod10(digit - roll) : digit
  const [shown, setShown] = useState({ cur: first, prev: first, flipping: false })
  const cur = useRef(first)
  const queue = useRef([])
  const busy = useRef(false)
  const timer = useRef(0)

  // the next figure in the queue that is not the one already showing
  const advance = useCallback(() => {
    let next
    do { next = queue.current.shift() } while (next != null && next === cur.current)
    if (next == null) { busy.current = false; return }
    busy.current = true
    setShown({ cur: next, prev: cur.current, flipping: true })
    cur.current = next
    // the fold is over after FLAP_MS whatever the compositor did with it
    clearTimeout(timer.current)
    timer.current = setTimeout(land, FLAP_MS)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The fold is done: the halves under it now carry the new figure, and the
  // next one in the queue goes after a beat.
  function land() {
    setShown((s) => ({ ...s, prev: s.cur, flipping: false }))
    clearTimeout(timer.current)
    timer.current = setTimeout(advance, FLAP_GAP)
  }

  // the roll, once, on mount: up through the figures to the one asked for.
  // The queue is assigned rather than added to, so an effect that runs twice
  // (React does, in development) rolls once.
  useEffect(() => {
    if (!roll) return undefined
    queue.current = Array.from({ length: roll }, (_, k) => mod10(digit - (roll - 1 - k)))
    timer.current = setTimeout(advance, delay)
    return () => clearTimeout(timer.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // a later change joins the queue, and goes now if nothing is moving
  const asked = useRef(digit)
  useEffect(() => {
    if (asked.current === digit) return
    asked.current = digit
    queue.current.push(digit)
    if (!busy.current) advance()
  }, [digit, advance])

  useEffect(() => () => clearTimeout(timer.current), [])

  const { cur: c, prev: p, flipping } = shown
  return (
    <span className={`wl-flap${flipping ? ' is-flipping' : ''}`} aria-hidden="true">
      {/* what is under the moving halves: the new top, the old bottom */}
      <span className="wl-flap-half is-top"><span>{c}</span></span>
      <span className="wl-flap-half is-bottom"><span>{p}</span></span>
      {/* the moving halves: the old top folding down, the new bottom folding in */}
      <span className="wl-flap-half wl-flap-fold is-top"><span>{p}</span></span>
      <span className="wl-flap-half wl-flap-fold is-bottom"><span>{c}</span></span>
    </span>
  )
}

export function Flap({ value, roll = false, delay = 0, className = '', style }) {
  const n = Math.max(0, Math.floor(value || 0))
  const digits = String(n).split('').map(Number)
  const len = digits.length
  return (
    <span className={`wl-flaps ${className}`} style={style} role="img" aria-label={String(n)}>
      {digits.map((d, i) => (
        // keyed from the right, so a count going from 99 to 100 keeps the
        // flaps it had and mounts one new one at the head; and the ones
        // column rolls furthest, the way an odometer turns
        <FlapDigit
          key={len - i} digit={d}
          roll={roll ? 3 + i * 2 : 0} delay={delay}
        />
      ))}
    </span>
  )
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ECLIPTIC, THE MARK                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The geometry moved to mark.js so the logo exporter in scripts/ can read it
// without a JSX parser and without a second copy of the constants. Every name
// is re-exported here unchanged, so every existing import of this file still
// resolves. What stays below is the part of the mark that needs React.

export { ECL, ECL_SPINE, INK, CHALK, NEAR, f2, rad, starPath, ringPath, eclipticSVG } from './mark.js'
import { ECL, ECL_SPINE, NEAR, f2, rad, starPath, ringPath } from './mark.js'


// The mark itself. Three layers in one paint, in this order and never
// reordered: the whole ring, the star notched by the near band's gutter, then
// the near band again over the top. That is what puts the ring behind the star
// at the top of its circuit and in front of it at the bottom.
//
// `sweep` is for the overture only: it masks both ring layers with a stroke
// running along the band's own centreline, so the ring can be DRAWN round its
// circuit rather than faded up. Everything else in the build takes the mark
// still, and pays for no mask it does not use.
export function Ecliptic({ size = 22, sweep = false, className = '', style, title }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ring = ringPath()
  return (
    <svg
      className={`wl-ecl ${className}`} style={style}
      width={size} height={size} viewBox="0 0 100 100"
      role={title ? 'img' : undefined} aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'} focusable="false"
    >
      <defs>
        <clipPath id={`${uid}n`}>
          <rect x={NEAR.x} y={NEAR.y} width={NEAR.width} height={NEAR.height} transform={NEAR.transform} />
        </clipPath>
        <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          <path d={ringPath(ECL.gutter)} fill="#000" fillRule="evenodd" clipPath={`url(#${uid}n)`} />
        </mask>
        {sweep && (
          <mask id={`${uid}s`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
            <path
              className="wl-ecl-sweep" d={ECL_SPINE} pathLength="100"
              fill="none" stroke="#fff" strokeWidth="24"
              strokeDasharray="100" strokeDashoffset="100"
            />
          </mask>
        )}
      </defs>
      <g className="wl-ecl-ring" mask={sweep ? `url(#${uid}s)` : undefined}>
        <path d={ring} fill="currentColor" fillRule="evenodd" />
      </g>
      <g className="wl-ecl-star" mask={`url(#${uid}m)`}>
        <path d={starPath(ECL)} transform="translate(50 50)" fill="currentColor" />
      </g>
      <g className="wl-ecl-ring is-near" mask={sweep ? `url(#${uid}s)` : undefined}>
        <path d={ring} fill="currentColor" fillRule="evenodd" clipPath={`url(#${uid}n)`} />
      </g>
    </svg>
  )
}

// ── the mark, taken apart ───────────────────────────────────────────────────
// The two halves of the ecliptic's own circuit, and the two points where they
// meet. Built from ECL rather than from a second set of numbers, so the figure
// the join screen assembles is provably THE MARK and not a drawing of one: move
// `rx` or `tilt` above and the arcs on that screen move with them.
//
// The endpoints are the extremes of the ring's long axis, which is what makes
// each path an exact half. `high` leaves the left node and travels over the
// top; `low` leaves the right node and travels under. Two people, one circuit,
// and neither half is a ring on its own.
export function eclipticHalves() {
  const { rx, flat, tilt } = ECL
  const ry = rx * flat
  const t = rad(tilt)
  const dx = rx * Math.cos(t), dy = rx * Math.sin(t)
  const right = [50 + dx, 50 + dy]
  const left = [50 - dx, 50 - dy]
  const arc = (from, to) =>
    `M${f2(from[0])} ${f2(from[1])}A${f2(rx)} ${f2(ry)} ${f2(tilt)} 0 1 ${f2(to[0])} ${f2(to[1])}`
  return { left, right, high: arc(left, right), low: arc(right, left) }
}

// ── THE TWO MARKS THAT ARE NOT OURS ─────────────────────────────────────────
//
// Instagram's and Google's, on the buttons that go to them, and both are the
// service's own mark rather than this product's drawing of it.
//
// That is a reversal, and `Verified` above is the precedent for it: it is drawn
// here for the same reason everything else is, AND because a claim about
// somebody's Instagram account has to read as that service's claim. The same
// argument runs on a door. A sign in button is a promise about where the next
// tap lands, and a person scanning three of them is not reading the words —
// they are looking for the mark they already know. `Provider` used to be a
// hairline camera on the icon set's 24-unit grid, on the argument that a pasted
// brand asset would be the one object in the build at a different weight; what
// that produced was a row of approximations, and beside Google's four-colour G
// redrawn as a single arc it read as a product that could not get the logos
// right. It is still not a pasted asset: both are paths in this file, at this
// file's sizes, taking `currentColor` like every other glyph here, so they sit
// in the build's own chalk and never in a brand's blue or a four-colour fill.
//
// They are SOLID, where the icon set is hairline, and that is the whole reason
// they are together in one block: two filled marks beside each other are a set,
// and a filled Google beside a hairline Instagram is the inconsistency this
// replaced. The envelope on the same door is a stroke glyph no longer — see
// `Envelope` below — for exactly that reason.
export function Provider({ size = 18, className = '' }) {
  return (
    <svg className={`wl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24"
      fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14c-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Z" />
      <path d="M12 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
      <circle cx="18.41" cy="5.59" r="1.44" />
    </svg>
  )
}

// Google's, as the single path the brand publishes for a monochrome placement,
// so it is the real G and not an arc that resembles one. `currentColor`, so it
// wears the button's chalk.
export function Google({ size = 18, className = '' }) {
  return (
    <svg className={`wl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24"
      fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.386-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.85l3.25-3.138C18.189 1.186 15.479 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.885 0 11.954-4.823 11.954-12.015 0-.795-.084-1.588-.239-2.356H12.24z" />
    </svg>
  )
}

// And the envelope beside them, solid rather than hairline. It is OURS — an
// address is not a brand and there is no logo for one — but it stands third in
// a row of three and an outline between two filled marks is the odd one out.
// The flap is cut through the body with `evenodd` rather than drawn over it in
// the button's own colour, so the glyph carries no ground and works on any.
export function Envelope({ size = 18, className = '' }) {
  return (
    <svg className={`wl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24"
      fill="currentColor" aria-hidden="true" focusable="false">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm.9 2L12 11.2 19.1 6H4.9ZM20 8.35l-7.42 5.44a1 1 0 0 1-1.18 0L4 8.35V18h16V8.35Z" />
    </svg>
  )
}

// The star drawn slim is still SPARK. Equal arms at `thick` 1 must redraw the
// constant above byte for byte, which is what makes the mark provably built on
// the curve the rest of the wall already uses rather than on a lookalike.
if (import.meta.env && import.meta.env.DEV) {
  const same = starPath({ up: 50, down: 50, side: 50, thick: 1 })
  const spark = SPARK.replace(/([\d.-]+) ([\d.-]+)/g, (m, x, y) => `${f2(x - 50)} ${f2(y - 50)}`)
  if (same !== spark) console.warn('[wall] the ecliptic star has drifted off SPARK', same, spark)
}

// ── the halftone sphere ─────────────────────────────────────────────────────
// A sphere rendered as a dot screen: dots on a fixed grid, clipped to a circle,
// each one sized by how far it is from a light source that sits off the
// upper-left shoulder. Near the light the dots swell until they nearly touch
// and read as solid; away from it they shrink to nothing and the ground shows
// through. That falloff IS the shading — there is no gradient anywhere in it.
//
// Built once into a path per render rather than as N elements: a 22×22 grid is
// ~380 circles, and 380 nodes for an ornament is a bad trade on a phone.
export function Halftone({ size = 96, grid = 20, className = '', style }) {
  const step = 100 / grid
  const dots = []
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const cx = (x + 0.5) * step
      const cy = (y + 0.5) * step
      const dx = cx - 50, dy = cy - 50
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d > 49) continue
      // distance from the light, normalised across the ball's diameter
      const lx = cx - 30, ly = cy - 28
      const lit = Math.sqrt(lx * lx + ly * ly) / 92
      // a hard rim keeps the silhouette readable once the dots get small
      const edge = Math.min(1, (49 - d) / 8)
      const r = Math.max(0, (0.52 - lit * 0.62)) * step * 1.5 * (0.35 + edge * 0.65)
      if (r < 0.16) continue
      dots.push(`M${cx.toFixed(2)} ${cy.toFixed(2)}m-${r.toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 -${(r * 2).toFixed(2)} 0`)
    }
  }
  return (
    <svg className={`wl-halftone ${className}`} style={style} width={size} height={size}
      viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d={dots.join('')} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}

// ── the campanile ───────────────────────────────────────────────────────────
// The wall's own object, where the dotted sphere used to sit in the corner of
// the masthead. The sphere was the reference poster's ornament and it said
// nothing about where the wall was; this is the one silhouette anybody who
// has stood on that campus knows from across the bay, drawn the way the rest
// of the art is drawn: in hairlines, from a handful of numbers, no asset.
//
// A front elevation of Sather Tower, simplified to what reads at sixty pixels
// wide: the plinth, the shaft with its corner pilasters and a run of slit
// windows, the clock, the observation deck's balustrade, the belfry with its
// three arches, the cornice and the steep pyramid roof. At the apex, the
// lantern: the wall's one sparkle, in the campus's gold, with a bloom behind
// it. The tower is lit at night, and that light is the masthead's light now.
//
// Strokes are one device pixel whatever the size (vector-effect), so it is a
// line drawing at every scale and never a filled glyph.
// `stands` is the tower with something under it. Floating, it dissolves at the
// foot, because a hairline drawing that simply stops reads as a drawing that
// ran out; standing, it must not, because the thing below it is solid and a
// tower that fades into its own base is a tower nobody built. So the mask
// comes off and the drawing ends on the upper plinth ledge: the course below
// that ledge is the count, and it is drawn by the thing that knows how wide
// the count is. Its lower ledge is a rule on the block itself
// (wall.css `.wl-board::before`), which is what keeps the cap the width of
// what it caps whether the wall is carrying nine letters or nine hundred.
export function Campanile({ width = 64, lit = true, twinkle = false, stands = false, className = '', style }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  // the belfry's three arches, and the shaft's slit windows
  const arches = [40, 47.25, 54.5].map((x) => `M${x} 104V73A3.25 3.25 0 0 1 ${x + 6.5} 73V104`).join('')
  const slits = [150, 186, 222, 258].map((y) => `M48.4 ${y}h3.2v9h-3.2z`).join('')
  const balusters = Array.from({ length: 9 }, (_, i) => `M${35 + i * 3.75} 111.5v4.5`).join('')
  // drawn to the foot of its plinth and no further when it is standing on
  // something, and to the full 300 when it is not
  const deep = stands ? 284 : 300
  return (
    <svg
      className={`wl-campanile${lit ? ' is-lit' : ''}${stands ? ' is-standing' : ''} ${className}`} style={style}
      width={width} height={Math.round(width * (deep / 100))} viewBox={`0 0 100 ${deep}`}
      aria-hidden="true" focusable="false"
    >
      <defs>
        <radialGradient id={`${uid}g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.55" />
          <stop offset="45%" stopColor="var(--gold)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="82%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${uid}m`}>
          <rect x="0" y="0" width="100" height={deep} fill={`url(#${uid}f)`} />
        </mask>
      </defs>
      {/* the light at the top, behind the drawing */}
      {lit && <circle className="wl-campanile-bloom" cx="50" cy="16" r="22" fill={`url(#${uid}g)`} />}
      <g
        className="wl-campanile-line" mask={stands ? undefined : `url(#${uid}m)`}
        fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {/* the roof: a steep pyramid, its ridge, and the cornice it sits on */}
        <path d="M50 16L32.5 60H67.5Z" />
        <path d="M50 16V60" opacity="0.45" />
        <path d="M30 60H70M31 64H69" />
        {/* the belfry: three arches between the shaft's edges */}
        <path d="M36 64V110M64 64V110" />
        <path d={arches} />
        {/* the observation deck: a ledge and its balusters */}
        <path d="M33 110H67M33 117H67" />
        <path d={balusters} opacity="0.7" />
        {/* the clock */}
        <circle cx="50" cy="134" r="7.5" />
        <path d="M50 134V128.5M50 134H54" />
        {/* the shaft: its edges, its corner pilasters, and the slit windows */}
        <path d="M36 117V282M64 117V282" />
        <path d="M40.5 117V282M59.5 117V282" opacity="0.4" />
        <path d={slits} opacity="0.75" />
        {/* the plinth. Standing, the two ledges are the cap on whatever is
            under the tower and the courses step out as they descend, the way
            a base course does; the verticals go, because the block below the
            ledges is the plinth's body and it is drawn out of flaps. */}
        <path d={stands ? 'M27 282H73' : 'M30 282H70M27 290H73M27 290V300M73 290V300'} />
      </g>
      {/* the lantern: SPARK, the same star as everywhere else, in gold, its
          centre exactly on the roof's apex so the star is the tip of the
          tower and not a thing floating over it. In its own small viewport
          rather than under a transform attribute, because the twinkle is a
          CSS transform and a CSS transform replaces the attribute rather
          than composing with it: drawn that way the star came up the width
          of the tower. */}
      {lit && (
        <svg x="40" y="6" width="20" height="20" viewBox="0 0 100 100" overflow="visible">
          <path
            className={`wl-campanile-lamp wl-spark${twinkle ? ' is-twinkle' : ''}`}
            d={SPARK} fill="var(--gold)"
          />
        </svg>
      )}
    </svg>
  )
}

// ── the orrery is gone ──────────────────────────────────────────────────────
// It was three axis-aligned ellipses in 0.34-unit hairlines with dots riding
// them, sitting under a mark built from a filled band at -19 degrees whose
// width varies three to one. It shared no constant with the logo, and it
// encoded three numbers the rows beneath it already carried, in words, more
// precisely. The core service draws letters now (screens/Core.jsx); nothing in
// the build asks for a ring system, so there is not one here to maintain.

// ── the bloom ───────────────────────────────────────────────────────────────
// The reference's modal is built around one enormous, heavily blurred white
// mass and nothing else. That mass is doing all of the emotional work on the
// screen, and it is doing it because it is the ONLY bright thing there.
//
// So: at most one per screen, and it is a luminance rather than a colour — a
// four-point star pushed through a 26px blur until the arms dissolve and only
// the warmth of it is left. A blur this heavy on a live element is a real cost
// on a phone, so it is drawn once into an SVG filter and promoted, not stacked
// out of box-shadows.
export function Bloom({ size = 300, opacity = 0.5, className = '', style }) {
  return (
    <svg className={`wl-bloom ${className}`} style={{ opacity, ...style }}
      width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <filter id="wl-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {/* ── the falloff, and why it is this steep ──
            Warm white at a low alpha over a near-black ground is GREY, and a
            wide flat falloff spreads that grey across three hundred pixels —
            which reads as smoke sitting on the screen rather than as a light
            source in it. The core is now bright and short: full at the centre,
            a quarter by a fifth of the radius, gone by half. What was a cloud
            with a visible edge is a small hot centre that falls off before
            anybody can find where it stops. */}
        <radialGradient id="wl-warm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--glow)" stopOpacity="1" />
          <stop offset="20%" stopColor="var(--glow)" stopOpacity="0.26" />
          <stop offset="48%" stopColor="var(--glow)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--glow)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#wl-warm)" />
      {/* The star inside the light, and it is small. At 0.64 of the field it
          was a sixty-four unit shape under a nine unit blur — a soft mass the
          width of the whole ornament, which over a near-black ground is grey,
          and grey spread that wide is smoke. Forty units under a six unit blur
          is a source: bright in the middle, finished before the edge. */}
      <g filter="url(#wl-soft)" opacity="0.5">
        <path d={SPARK} fill="var(--glow)" transform="translate(30 30) scale(0.4)" />
      </g>
    </svg>
  )
}

// ── the constellation ───────────────────────────────────────────────────────
// Where the reference puts a circular photograph beside a name, this build
// puts a small star figure derived from the handle. Not decoration and not an
// avatar substitute: the same handle draws the same figure everywhere it
// appears, so a person learns their own mark on the wall and recognises it in
// a list two screens later without reading the text.
//
// Four to six stars, placed on a jittered ring so no figure collapses into a
// line, joined in sequence by a hairline. The brightest star is the first one.
//
// ── the gauge ───────────────────────────────────────────────────────────────
// On the core service a mark stands beside a ping, and a ping is a countdown.
// `gauge` (0..1, how much of the sixty days is spent) draws that countdown on
// the figure's own ring, starting at the top and going clockwise. So the thing
// that identifies the person IS the thing that says how long is left, in one
// object, in the place a list would otherwise need a second column for.
//
// It is opt-in and absent everywhere else: the same handle draws the same
// figure on the wall, in the search and in the bar, and a progress arc on a
// letter would be a countdown on something that is not counting.
export function Mark({ handle, size = 34, lit = false, gauge = null, tone = '', className = '', style }) {
  const seed = hash(handle || 'celestual')
  const n = 4 + (seed % 3)
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(handle, i) * 1.1
    const r = 20 + rand(handle, i + 40) * 16
    pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r])
  }
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('')
  const g = gauge == null ? null : Math.min(1, Math.max(0, gauge))
  return (
    <svg className={`wl-mark${lit ? ' is-lit' : ''}${tone ? ` is-${tone}` : ''} ${className}`} style={style}
      width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="48" className="wl-mark-ring" />
      {g != null && (
        <circle
          cx="50" cy="50" r="48" pathLength="100" className="wl-mark-gauge"
          strokeDasharray={`${(g * 100).toFixed(1)} 100`} transform="rotate(-90 50 50)"
        />
      )}
      <path d={line} className="wl-mark-line" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 4.4 : 2.6} className="wl-mark-star" />
      ))}
    </svg>
  )
}

// ── the field ───────────────────────────────────────────────────────────────
// The ground the whole prototype sits on. Every point is one live letter, so
// the density of the sky is the real size of the wall and a thin wall looks
// thin — which is honest, and which is also why the field is worth having at
// all rather than being a background image.
//
// Canvas, not DOM. Ninety drifting nodes is ninety composited layers the
// browser has to reconcile every frame; on a canvas it is one. It idles at
// well under a frame's budget because nothing here is recomputed — positions
// come out of the hash once, and the only per-frame work is a phase advance
// and a fill.
export function Field({ count = 72, mode = 'drift', hidden = false }) {
  const ref = useRef(null)
  const state = useRef({ raf: 0, t: 0, mode, target: 1, ease: 1 })

  useEffect(() => { state.current.mode = mode }, [mode])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d', { alpha: true })
    if (!ctx) return
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1
    const stars = []
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rand(`f${i}`, 1),
        y: rand(`f${i}`, 2),
        // a cubed magnitude puts most of the field near invisible and a handful
        // genuinely bright, which is what a real sky does and what an evenly
        // random one conspicuously does not
        m: Math.pow(rand(`f${i}`, 3), 3),
        sp: 0.25 + rand(`f${i}`, 4) * 0.75,
        ph: rand(`f${i}`, 5) * Math.PI * 2,
      })
    }

    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = cv.clientWidth; h = cv.clientHeight
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(cv)

    let last = performance.now()
    function frame(now) {
      const dt = Math.min(48, now - last); last = now
      const s = state.current
      // `still` does not stop the field on the frame it is asked to — it
      // decelerates over about a second. A sky that halts is a bug; a sky that
      // slows to nothing is the room holding its breath, which is the point.
      s.target = s.mode === 'still' ? 0 : s.mode === 'slow' ? 0.18 : 1
      s.ease += (s.target - s.ease) * Math.min(1, dt / 620)
      s.t += dt * 0.001 * s.ease

      ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i]
        // a slow lateral drift that wraps, plus a breath on the alpha
        const x = ((st.x + s.t * 0.004 * st.sp) % 1) * w
        const y = st.y * h
        const tw = 0.55 + 0.45 * Math.sin(s.t * 0.6 * st.sp + st.ph)
        const a = (0.05 + st.m * 0.62) * (0.55 + tw * 0.45)
        const r = 0.5 + st.m * 1.35
        ctx.globalAlpha = a
        ctx.fillStyle = '#F4F1EA'
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 6.2832)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      s.raf = requestAnimationFrame(frame)
    }

    if (reduce) {
      // One static frame. The field still carries its meaning — this many
      // points, this many letters — it simply does not move.
      state.current.ease = 0
      frame(performance.now())
      cancelAnimationFrame(state.current.raf)
    } else {
      state.current.raf = requestAnimationFrame(frame)
    }

    return () => { cancelAnimationFrame(state.current.raf); ro.disconnect() }
  }, [count])

  return <canvas ref={ref} className={`wl-starfield${hidden ? ' is-hidden' : ''}`} aria-hidden="true" />
}

// ── the step dots ───────────────────────────────────────────────────────────
// Straight off the bottom of the poster. Used for the composer's three steps,
// which is the only place in the build with a sequence worth counting.
export function Dots({ n, at, onGo }) {
  return (
    <div className="wl-dots" role="tablist" aria-label="step">
      {Array.from({ length: n }, (_, i) => (
        <button
          key={i} type="button" role="tab" aria-selected={i === at}
          aria-label={`step ${i + 1}`}
          className={`wl-dot${i === at ? ' is-on' : ''}${i < at ? ' is-done' : ''}`}
          onClick={onGo && i < at ? () => onGo(i) : undefined}
          disabled={!onGo || i > at}
        />
      ))}
    </div>
  )
}

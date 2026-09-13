// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE HIVE: the names on the wall, as a crowd seen through a lens         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The wall's index is a list of people, and this is how the wall shows it:
// one disc per person, the face the resolver has or a monogram until then,
// laid on a hexagonal lattice that never ends in any direction and then bent
// by a lens. The whole field is one continuous radial function of where a
// disc stands relative to the light: at the middle the discs are large and
// nearly touching, and outward they shrink, open apart and scatter, until at
// the rim they are points a long way from each other and the mask has taken
// them. Nothing is written on the field but one name: the person the lens is
// reading carries a small plate with their handle, and there is only ever one.
//
// ── one function, three effects ─────────────────────────────────────────────
// This is the whole aesthetic and it is worth stating plainly, because every
// number in `LENS` below is a knob on it. For each disc we compute `u`, its
// distance from the light in units of the screen's own half-size, and from
// that one number come three things:
//
//   SIZE     `z`, the scale. Full and a hair over at the middle, falling on a
//            power curve to a fifth of that at the rim.
//   SPACING  `open`, how far the lattice is pushed out from the light. One at
//            the middle, half again by the rim, so the crowd thins as it goes.
//   SLACK    what is left between a disc and its neighbour once the first two
//            have had their say. It is the room a disc is allowed to wander
//            in, and every wander below is a fraction of it — so the middle,
//            where there is no room, is ordered and still, and the rim, where
//            there is a great deal, is scattered and adrift. Two discs can
//            never collide, because neither can spend more room than exists.
//
// That last one is what stops this reading as a grid. A hexagonal lattice with
// a size ramp on it is a grid with a size ramp on it; a lattice whose disorder
// is exactly the space its own packing left over is a crowd.
//
// ── what a disc carries, and why only that ──────────────────────────────────
// The face, and nothing else. Not the name, which the resolver knows for a few
// people and not for most; not the count, which is the disc's own size; not
// the time since the last letter. A field with a caption under every third
// face is a directory, and the wall is a place where people are, not a list
// about them. One handle is on the screen at a time, on one plate, and it
// belongs to whoever the lens is reading: under a mouse that is the disc the
// pointer is on, and on a phone it is the disc in the middle. The plate is a
// single element that moves — not one per cell, sixty of them fading past
// each other under a moving pointer.
//
// ── it moves by itself, and every disc moves differently ────────────────────
// One slow drift, always, whose heading wanders so the field never runs one
// way for long; and on top of it every disc breathes on its own clock, by its
// own amount, in its own direction. A field that translates as one block is a
// picture being panned. A pull takes the field with the finger in any
// direction, a throw coasts on friction and eases back into the drift rather
// than stopping, and a wheel or a trackpad pans it. A pinch opens it out or
// closes it up, within limits (ZOOM): the pitch of the lattice is what
// changes, about the point between the fingers, and nothing is re-laid out.
//
// ── and it answers the pointer ──────────────────────────────────────────────
// A mouse is a second, smaller light. The discs under it swell, part around
// it to make the room that swelling needs, and the nearest one is named. The
// field's own light leans a little toward it, so the whole crowd is aware of
// where you are without the picture sliding under you. Move the pointer and a
// bulge travels over the faces; take it away and the crowd closes over it.
// A finger gets none of this, because a finger is already the pull.
//
// ── it has to work at five names and at five hundred ────────────────────────
// The lattice is a torus: a tile of C by R cells that repeats in both axes, so
// there is no first name and no last one and no edge to reach. The tile is
// the smallest with room for every name, the names are laid into it from its
// middle outward in the order the index carries them (newest first), so the
// most recently written to sit together at the centre of the tile and the
// stalest at its rim. Cells left over are filled from the heaviest names, so a
// wall of five is a field of the same five, which is the truth, and a wall of
// three hundred repeats only at a distance nobody sees twice.
//
// ── what is drawn, and what is not ──────────────────────────────────────────
// The DOM holds a pool of slots the size of the screen and no more, however
// many names the wall carries. A cell of the lattice that comes onto the glass
// takes a free slot and keeps it for as long as it is on the glass; a cell
// that leaves gives its slot back; and when no slot is free the pool grows by
// one, for good. So no disc ever changes hands while it is on the screen, at
// any zoom, and the pool is exactly as large as the most the screen has ever
// needed. It used to be a fixed grid of slots addressed by the cell's
// coordinates modulo the grid, which was the right size only for the zoom it
// was cut for: past that, two cells shared a slot and one of them was not
// drawn, and re-cutting the grid for a pinch handed every disc on the field
// to a different element under the fingers, which is what a pinch pulled hard
// looked like. Positions and scales are written straight to the elements from
// one requestAnimationFrame, and only when they have moved; React is told only
// when a slot changes hands or the lens moves to another person, and a slot
// is handed a name and a count rather than the index's row, so a new reading
// of the index re-renders only the discs whose names actually moved. The disc
// is scaled and the plate is not, so the type stays sharp whatever the lens is
// doing to the picture.
//
// ── the pulse ───────────────────────────────────────────────────────────────
// The veil opens from the finger, and what opens it is not a line drawn over
// the field but a wave sent through it. The caller (screens/Wall.jsx) owns one
// object — where it was touched and how far the front has travelled this
// frame — and the loop reads it: every disc is measured against the front,
// and the ones under the crest swell, are pushed out ahead of it, drawn back a
// hair behind it, and settle. The lens arrives with the light: inside the
// front a disc is drawn at the field's full lens and outside it at the veiled
// one, so the field is seen to bloom as the wave crosses it rather than on a
// clock of its own. The wave loses a little as it goes and dies at the far
// corner, the way a ripple does.
//
// ── and it is drawn for the screen it is on ─────────────────────────────────
// The lens is not two constants either side of a breakpoint. On a wide screen
// it is the lens above: full at the light, a quarter at the rim, the lattice
// half again as open by the edge. A phone held upright has its two long edges
// a hand's width from the light, and the same ramp put the rim of the lens on
// them: three discs from the middle the crowd was already points a long way
// apart, and the sides of the screen were empty. So on a narrow, tall window
// the lens is drawn taller than it is wide and its fall is gentler (lensFor):
// the edges a phone actually has stand well inside it, and the crowd runs to
// them. Nothing about the packing changes, so nothing can overlap that could
// not before.
//
// Under `prefers-reduced-motion` nothing drifts, breathes, coasts, bulges or
// pulses: the field is still, the lens still applies, and a pull moves it and
// leaves it.

import { memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Face, Label } from './parts.jsx'
import { atHandle } from './data.js'
import { takeOff, setLocator } from './morph.js'

// ── the numbers ─────────────────────────────────────────────────────────────
// At most this many names in the field. Past it the rest are a search away,
// and a torus of three hundred already repeats only at the far side of a wall
// nobody scrolls to.
const CAP = 240
// The row pitch as a fraction of the column pitch: a true hexagonal packing.
const ROW = 0.866
const TAU = Math.PI * 2

// ── the disc, by weight ──
// The fraction of the pitch a face fills, from how many letters the name
// carries. Continuous rather than three steps: the wall's whole shape is one
// smooth function of a number and the size a name is set at should be too, so
// a fourth letter moves a disc a little rather than nothing and a third moves
// it into a bracket. The ceiling is 0.92, which is the number every collision
// guarantee below is written against.
const DISC_MIN = 0.72
const DISC_SPAN = 0.20
const DISC_TOP = 7          // the count at which a name is as large as it gets

// ── the lens ──
// `hold` is how far out (in half-screens) the discs stay full, `rim` the scale
// at the edge of that measure, `fall` how fast it drops between them, `crown`
// the hair over full a disc gets dead centre so the light has a point.
// `open`/`openPow` are the lattice's own spreading, `slack` is how much of the
// room a packing leaves over a disc is allowed to wander into, and `air` is
// how much light a disc has left at the rim. `veiled` is
// how much of all of it applies while the masthead is over the field: not
// none, because a flat grid of faces under a title is wallpaper, and the
// poster wants its depth before anybody has pressed anything.
const LENS = {
  hold: 0.26,
  rim: 0.24,
  fall: 1.34,
  crown: 1.09,
  open: 0.34,
  openPow: 1.9,
  slack: 0.62,
  air: 0.52,
  veiled: 0.58,
}
// ── the same lens, on a phone ──
// What the four ramps become on a narrow window held upright: the rim nearly
// half rather than a quarter, a straighter fall to it, a lattice that barely
// opens, and more light left at the edge. `side` is how far the lens's
// horizontal radius is drawn out toward its vertical one, so the two long
// edges are not the rim. The numbers are blended in by `lensFor` off the
// window's own shape, so a tablet gets something between and a laptop gets
// none of it.
const PHONE = { rim: 0.46, fall: 1.05, open: 0.16, air: 0.72, side: 0.74 }
// ── the pulse ──
// The crest's width in pitches; how much a disc under it swells, and how
// much of the gap its packing leaves it the swell may take (the rest is the
// room its neighbours wander in, so a disc under the crest grows into the
// space there is and never into a face); how far it is pushed, as a
// fraction of the pitch (the shove peaks at four tenths of this, at the
// shoulder of the crest); how much of that a disc is drawn back behind the
// crest, which is a fraction because a draw toward the tap closes the ring
// of discs round it; how much of the wave is lost by the far corner; and
// how much light the crest puts on a face as it passes.
const PULSE = { width: 1.7, swell: 0.28, fill: 0.6, push: 0.75, back: 0.25, decay: 0.45, light: 0.5 }
// ── the tap ──
// A press on a disc is answered the way the veil's tap is answered: a pulse
// sent out from the disc through the crowd, and the disc brought into the
// light. The letter opens out of the disc ON THE SAME FRAME: the card claims
// the disc's circle where it is standing at the press and the pulse and the
// travel run out under the sheet's glass, so the crowd is where the letter
// left it when the sheet comes down. It used to wait half a second for the
// crest to leave the disc before opening, and half a second between a
// finger landing on a name and anything readable arriving is the moment
// the surface stops feeling like a thing being touched (a press is answered
// on the way down, not after an animation). `CENTRE_K` is the travel's time
// constant. The pulse's own clock is the veil's, shortened: it has less
// glass to cross and it should be seen to go rather than to crawl.
const CENTRE_K = 300
// A pulse the wall sends from a name that is off the glass travels first and
// pulses second: this long after the travel starts, the disc is most of the
// way in and the wave is seen to leave a person rather than to arrive from
// nowhere.
const TRAVEL_FIRST_MS = 360
const TAP_MIN = 1100
const TAP_MAX = 1700
const TAP_BASE = 800
const TAP_PER_PX = 0.55
const TAP_POW = 1.45
const TAP_RISE = 0.12
const TAP_TAIL_FROM = 0.86
const TAP_TAIL_TO = 1.3
// The pointer's own light: how wide it reaches (in pitches), how much it adds
// to a disc under it, and how hard it parts the crowd to make the room.
//
// The swell is small on purpose. At a third over, a full disc at the middle
// of the lens was drawn at more than a whole pitch and lay over the faces on
// either side of it, and the crowd could not part fast enough to make that
// much room; the ring on the read disc then closed over its neighbours. At a
// seventh the disc under the pointer still lifts, the parting makes more
// room than it needs, and nothing on the field is ever under anything else.
const TOUCH = { reach: 1.75, swell: 0.14, part: 0.42 }
// How far the field's light leans toward the pointer, as a fraction of the
// offset, and the ceiling on that lean as a fraction of the smaller side. The
// picture must not slide under the pointer; it must be aware of it.
const LEAN = { pull: 0.14, cap: 0.1 }
// The drift: its speed, and how fast its heading wanders (radians a second,
// so a full turn takes a minute and a half). It was seven pixels a second,
// which on a phone read as a field that might be moving; eleven is a field
// that is, and still slow enough that a name can be pressed without chasing
// it.
const DRIFT = 11
const TURN = 0.065
// A disc's own breathing: the slowest and fastest periods, in seconds, and
// how much of its slack it may spend on it.
const BREATH = { slow: 17, fast: 31, amp: 0.34 }
// How much of a velocity survives each 60Hz frame as it relaxes toward the
// drift. 0.94 coasts about a second and a half, which is long enough to feel
// like weight and short enough that the field is visibly its own again before
// anybody wonders.
const RELAX = 0.94
const FLING = 2400
const SLOP = 6
// ── the zoom ──
// The field can be opened out and closed up, by a pinch on a phone and by
// the trackpad's pinch or a ctrl+wheel on a desktop, and only to a
// reasonable degree: down to about seven tenths of its pitch, where the
// crowd is a crowd and every face is still a face, and up to about half
// again, where the light holds five or six names. Past either end a pinch
// is rubber banded, the way a scroll is at the end of a list, and let go it
// eases back to the limit. The zoom is a factor on the lattice pitch and on
// nothing else: the discs are laid out in the DOM at the window's own pitch
// and scaled by the loop, so a pinch costs no re-render. `wheel` is how much
// a wheel notch zooms, per pixel of delta.
//
// `pool` is the zoom the slot pool is cut for on the first seating: a little
// past the window's own pitch, so the first frames need no slot the pool does
// not have. Past that the pool grows on demand and never shrinks (the slots,
// below). `over` is how far past either limit a pinch can be dragged, in log
// units of the zoom: about fifteen percent. The band used to let a pinch
// through to nearly three times the limit, and a field at a third of its
// pitch is fourteen times the discs of the field at rest, which is a DOM
// nobody's phone can grow inside one gesture.
const ZOOM = { min: 0.72, max: 1.45, wheel: 0.0022, band: 0.55, over: 0.15, pool: 0.9 }
// The most cells handed a slot on one frame. A pinch pulled hard brings
// dozens of cells onto the glass at once, every one a disc for React to
// mount, and mounting them all on the frame they arrive is the frame that
// drops; the ones past this wait a frame, at the rim, where they are small
// and arriving anyway.
const ASSIGN_PER_FRAME = 28
// How long a name that has just arrived on the wall is drawn as new.
const FRESH_MS = 2200
// ── the window, and the window's bar ──
// A phone's browser bar comes and goes as the page is scrolled, and the
// stage's height with it, by eighty pixels or so, many times a minute. The
// field used to answer every one of those as a new window: a new centre for
// the light, a new rim for the lens, and when the change was worth a row of
// slots, a new pool, which handed every disc on the screen to a different
// slot in the same frame. That was the wall seen to breathe and reshuffle
// under a thumb. So the lens is drawn for a height that moves only when the
// window has actually changed shape (a turn, a resize, a keyboard: more
// than this share of it, or more than this many pixels), and the pool is
// cut with this much headroom below the stage, so the taller stage a
// collapsed bar leaves is already covered and no slot changes hands.
const RESHAPE_PX = 160
const RESHAPE_SHARE = 0.24
const HEADROOM = 220

const mod = (v, m) => ((v % m) + m) % m
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

// A zoom a pinch is asking for, held inside its limits by a rubber band: in
// log space, so a pinch in and a pinch out resist the same way, the
// overshoot is let through at a falling fraction of itself and never past
// a bound of its own (ZOOM.over). Apple's own curve, from the fluid
// interfaces talk, with the bound set for a zoom rather than for a scroll.
function bandZoom(raw) {
  const lz = Math.log(Math.max(1e-3, raw))
  const lo = Math.log(ZOOM.min)
  const hi = Math.log(ZOOM.max)
  const rb = (over) => (over * ZOOM.band) / (1 + (ZOOM.band / ZOOM.over) * Math.abs(over))
  if (lz > hi) return Math.exp(hi + rb(lz - hi))
  if (lz < lo) return Math.exp(lo - rb(lo - lz))
  return raw
}

// A cell's key in the slot map: two lattice indices folded into one integer,
// since a Map keyed on integers is a hash and one keyed on strings is a
// string built and hashed for every cell on every frame.
const KEY_OFF = 1 << 20
const KEY_ROW = 1 << 21
const cellKey = (I, J) => (J + KEY_OFF) * KEY_ROW + (I + KEY_OFF)
function newSlot() {
  return { I: NaN, J: NaN, k: -1, key: -1, el: null, disc: null, shown: false, used: 0, tf: '', op: '', n: 0, delay: 0 }
}

// ── the pitch ───────────────────────────────────────────────────────────────
// The lattice's column spacing, and through it every size on the screen. It
// is a function of the window rather than two hard numbers either side of a
// breakpoint: a 1024px tablet and a 1400px laptop are not the same picture
// and neither is a tall phone and a phone lying down. Width sets it, height
// caps it so a landscape phone does not get four enormous faces, and the
// ceiling stops a very wide screen from drawing portraits.
function pitchFor(w, h) {
  return Math.round(Math.max(56, Math.min(w * 0.185, h * 0.142, 116)))
}

// The lens, for this window. One number, `k`, says how much of a phone this
// is — nought on anything wider than 760px or squarer than 4:5, one on a
// phone held upright — and the four ramps and the lens's own shape are
// blended between LENS and PHONE on it.
function lensFor(w, h) {
  const narrow = clamp01((760 - w) / 360)
  const tall = clamp01((h / Math.max(1, w) - 1.1) / 0.6)
  const k = narrow * tall
  return {
    rim: LENS.rim + (PHONE.rim - LENS.rim) * k,
    fall: LENS.fall + (PHONE.fall - LENS.fall) * k,
    open: LENS.open + (PHONE.open - LENS.open) * k,
    air: LENS.air + (PHONE.air - LENS.air) * k,
    side: PHONE.side * k,
  }
}

// The wave, this frame, in the stage's own frame. The caller's object is in
// the window's coordinates and is written on every frame of the opening; the
// tap is placed once per wave, the rest is read.
function readWave(m, wave, el) {
  const w = wave && wave.current
  if (!w || w.amp <= 0.001) { m.wave = null; return null }
  let v = m.wave
  if (!v || v.id !== w.id) {
    const r = el ? el.getBoundingClientRect() : { left: 0, top: 0 }
    v = m.wave = { id: w.id, x: w.cx - r.left, y: w.cy - r.top, R: 0, amp: 0, rmax: 1 }
  }
  v.R = w.r
  v.amp = w.amp
  v.rmax = Math.max(1, w.rmax)
  return v
}

// The tap's pulse, this frame. It is the field's own, so it lives in the
// lattice rather than on the glass: its origin is a point in world units and
// is put back on the screen every frame from where the field is now, which
// is what keeps the ring centred on the person it left as they travel to
// the middle. The front runs the same shallow ease the veil's does and lets
// its amplitude go over a tail; when nothing is left of it, it is gone.
function readTap(m, now) {
  const t = m.tap
  if (!t) return null
  const p = (now - t.t0) / t.ms
  if (p >= TAP_TAIL_TO) { m.tap = null; return null }
  const front = 1 - Math.pow(1 - Math.min(1, p), TAP_POW)
  t.R = t.rmax * front
  t.amp = p < TAP_RISE ? p / TAP_RISE
    : p < TAP_TAIL_FROM ? 1
    : Math.max(0, 1 - (p - TAP_TAIL_FROM) / (TAP_TAIL_TO - TAP_TAIL_FROM))
  t.x = t.wx + m.o.x
  t.y = t.wy + m.o.y
  return t
}

// The crest of a wave, on one disc. A disc ahead of the front is pushed out
// ahead of it, swells as the crest reaches it, is drawn back a little behind
// it, and settles; the shove is largest at the crest's shoulders and nothing
// at the crest itself, so the discs under it are spread apart exactly where
// they are largest. The swell is the crest's where there is room for it and
// the gap's where there is not: at the light, where the crowd is packed, a
// disc lifts a little; out toward the rim, where the discs are small and far
// apart, it swells whole. The draw back behind the crest is a fraction of the
// shove, and let go altogether within a few pitches of the origin, because an
// inward pull there closes the ring of neighbours over the disc that was
// touched. The wave is weaker the further it has come, and a face under the
// crest catches some light. One function for the veil's wave and the tap's,
// so the two pulses on this field are one kind of thing.
function crest(wv, ax, ay, S, W, open, d, z) {
  const wx = ax - wv.x
  const wy = ay - wv.y
  const wr = Math.sqrt(wx * wx + wy * wy)
  const wq = (wr - wv.R) / W
  if (wq <= -2.6 || wq >= 2.6) return null
  const g = Math.exp(-wq * wq)
  const a = wv.amp * g * (1 - PULSE.decay * Math.min(1, wr / wv.rmax))
  const gap = Math.max(0, S * open - d * z)
  const zCap = z + (gap * PULSE.fill) / d
  const z2 = Math.min(z * (1 + PULSE.swell * a), Math.max(z, zCap))
  let dx = 0
  let dy = 0
  if (wr > 0.01) {
    const back = wq < 0 ? PULSE.back * Math.min(1, wr / (3 * S)) : 1
    const dd = PULSE.push * S * a * wq * back
    dx = (wx / wr) * dd
    dy = (wy / wr) * dd
  }
  return { z: z2, dx, dy, lift: PULSE.light * a }
}

// A stable scatter per lattice cell. The same name at two repeats of the torus
// gets two different offsets, which is the point: a repeat should not read as
// a copy of the tile beside it.
function cellNoise(I, J) {
  let a = (Math.imul(I, 374761393) + Math.imul(J, 668265263)) >>> 0
  a = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0
  a ^= a >>> 16
  return a >>> 0
}

// ── the tile ────────────────────────────────────────────────────────────────
// C by R cells, R even so the offset rows line up across the seam. Cells are
// ranked by their distance from the tile's middle cell, and on the FIRST
// seating the names are laid in by rank, so the index's order — newest first —
// reads outward from the centre. Leftover cells take the heaviest names, in
// turn.
//
// ── and after that, nobody moves ────────────────────────────────────────────
// Every later seating keeps every name where it already was. The index is
// ordered by when each name was last written to, so one letter posted while
// somebody is looking at the wall moves that name to the front of it and
// pushes every other name one place along — and seating strictly by rank
// turned a single letter into a full reshuffle of sixty faces. Whatever else
// that is, it is not "a name arrived": the one thing that actually happened is
// invisible inside sixty things that did not.
//
// So a name holds its seat for as long as it is on the wall, seats given up by
// names that have come down are handed to names that have just arrived, and
// the ranked order only decides where somebody sits the first time. What the
// wall then shows when a letter goes up is one disc rising in place, which is
// the truth (Hive `fresh`, wall.css `.wl-cell.is-new`).
//
// ── and nobody moves when the tile grows, either ────────────────────────────
// A seat is a cell, (i, j), and not a rank. The tile is cut larger as names
// arrive, and when it is, every cell of the old tile is a cell of the new one,
// so a name keeps the cell it had and only the names that have just arrived
// take cells: the free ones nearest the middle, in the index's order. It used
// to keep seats only while the tile's size held, and re-seat the whole wall
// by rank when it grew, which on a live wall was every disc on the field
// moving to show one letter arriving. The tile also has a floor, four by
// four, so a wall of a handful of names, which is every wall on its first
// day, is not re-cut for each of its first dozen letters; the cells past the
// names are filled from the heaviest names, in turn, which is what they
// always were.
const TILE_MIN = 4
function tileUp(tiles, was) {
  const n = tiles.length
  const C = Math.max(TILE_MIN, Math.ceil(Math.sqrt(n * 1.15)))
  let R = Math.max(TILE_MIN, Math.ceil(n / C))
  if (R % 2) R += 1
  const ic = Math.floor(C / 2)
  const jc = Math.floor(R / 2)
  const cells = []
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      const dx = (i + (j & 1) * 0.5) - (ic + (jc & 1) * 0.5)
      const dy = (j - jc) * ROW
      cells.push({ i, j, d: dx * dx + dy * dy, a: Math.atan2(dy, dx) })
    }
  }
  cells.sort((p, q) => p.d - q.d || p.a - q.a)

  // ── the seating ──
  const at = new Int32Array(C * R).fill(-1)
  const seats = new Map()
  // names that had a cell keep it, if the tile still has that cell and
  // nobody else has been given it
  const keep = was && was.seats
  if (keep) {
    for (let k = 0; k < n; k++) {
      const seat = keep.get(tiles[k].handle)
      if (!seat) continue
      const [i, j] = seat
      if (i >= C || j >= R || at[j * C + i] >= 0) continue
      at[j * C + i] = k
      seats.set(tiles[k].handle, seat)
    }
  }
  // the rest take the free cells nearest the middle, in the index's own
  // order, so a new name sits as near the light as the wall has room for
  let next = 0
  for (let k = 0; k < n; k++) {
    if (seats.has(tiles[k].handle)) continue
    while (next < cells.length && at[cells[next].j * C + cells[next].i] >= 0) next++
    if (next >= cells.length) break
    const c = cells[next]
    at[c.j * C + c.i] = k
    seats.set(tiles[k].handle, [c.i, c.j])
  }
  // and the cells left over take the heaviest names, in turn
  if (n) {
    const pool = tiles.map((_, k) => k)
      .sort((a, b) => tiles[b].count - tiles[a].count || tiles[b].at - tiles[a].at)
    let p = 0
    for (const c of cells) {
      const idx = c.j * C + c.i
      if (at[idx] < 0) at[idx] = pool[p++ % n]
    }
  }
  return { C, R, at, ic, jc, seats }
}

// One slot. A button, because every name is a target. The disc is placed and
// scaled by the loop; the orb inside it is the CSS's, so an arrival, a press
// and a new letter can be animated without the loop and the stylesheet
// writing to the same transform. Memoised so a slot re-renders only when its
// name changes or the lens arrives on it or leaves it: it is handed the name
// and the count as two values rather than the index's row, so a new reading
// of the index that did not move this name does not touch this disc.
const Cell = memo(function Cell({ s, handle, count, d, focus, mine, fresh, delay, bind, onOpen, onHover, onPeek }) {
  if (!handle) return <button type="button" className="wl-cell" ref={(el) => bind(s, el)} tabIndex={-1} aria-hidden="true" />
  return (
    <button
      type="button"
      className={`wl-cell${focus ? ' is-focus' : ''}${mine ? ' is-mine' : ''}${fresh ? ' is-new' : ''}`}
      style={{ '--d': `${d}px`, '--in': `${delay}ms` }}
      data-slot={s}
      ref={(el) => bind(s, el)}
      onClick={(e) => onOpen(handle, e)}
      /* the letters under this name are asked for on the way down, so a tap
         that turns into an open has a head start on the words */
      onPointerDown={onPeek ? () => onPeek(handle) : undefined}
      onPointerEnter={(e) => onHover(s, e)}
      onPointerLeave={(e) => onHover(-1, e)}
      aria-label={`${atHandle(handle)}, ${count === 1 ? 'one letter' : `${count} letters`}`}
      draggable={false}
    >
      <span className="wl-cell-disc" aria-hidden="true">
        <span className="wl-cell-orb">
          <Face handle={handle} size={d} lit={mine} />
        </span>
      </span>
    </button>
  )
})

export default function Hive({ tiles, reduce = false, veiled = false, paused = false, opening = false, mine = [], none = '', wave = null, onOpen, onPeek, ref = null }) {
  const names = useMemo(() => tiles.slice(0, CAP), [tiles])
  // The last seating, carried forward so a new reading of the index does not
  // move anybody who was already on the wall. Written during the memo rather
  // than in an effect because the layout it feeds is needed by the same
  // render; `tileUp` is idempotent given its own output, so a double
  // invocation under StrictMode produces the same seating twice.
  const seating = useRef(null)
  const lay = useMemo(() => {
    const out = tileUp(names, seating.current)
    seating.current = { seats: out.seats }
    return out
  }, [names])
  const wrote = useMemo(() => new Set(mine), [mine])

  const stage = useRef(null)
  const say = useRef(null)
  const size = useRef({ w: 0, h: 0 })
  // Whether the pool has been cut: the loop starts when it has.
  const [grid, setGrid] = useState(false)
  // Which name each slot holds, as React sees it, one entry per slot. The
  // loop keeps its own copy in `motion.slots` and tells React only when a
  // slot changes hands or the pool grows.
  const [assign, setAssign] = useState([])
  // The person the lens is reading, by cell.
  const [focusKey, setFocusKey] = useState('')

  // ── the names that have just arrived ──
  // The index is re-read whenever the corpus moves, and a name that was not on
  // the last reading of it, or one that has gained a letter since, is drawn as
  // new for a couple of seconds: it rises into the field rather than being
  // there the next time you look. The first reading of all is not an arrival —
  // everything is new on an empty wall, and a wall that pops sixty times on
  // load is a wall having a seizure.
  //
  // Behind a sheet or under the veil the arrival waits. The index moves while
  // the composer is still up over the wall, and a disc that rose behind the
  // glass rose for nobody: it rises when the glass has gone, which is the
  // beat the wall sends its pulse out from the same disc (`pulse`, below).
  const seen = useRef(null)
  const held = useRef(null)
  const freshT = useRef(0)
  const [fresh, setFresh] = useState(null)
  const show = useCallback((up) => {
    clearTimeout(freshT.current)
    setFresh(up)
    freshT.current = window.setTimeout(() => setFresh(null), FRESH_MS)
  }, [])
  useEffect(() => () => clearTimeout(freshT.current), [])
  useEffect(() => {
    const was = seen.current
    const now = new Map(names.map((t) => [t.handle, t.count]))
    seen.current = now
    if (!was || !was.size || reduce) return
    const up = new Set()
    for (const [h, n] of now) { const had = was.get(h); if (had === undefined || n > had) up.add(h) }
    if (!up.size) return
    if (paused || veiled) { held.current = new Set([...(held.current || []), ...up]); return }
    show(up)
  }, [names, reduce, paused, veiled, show])
  useEffect(() => {
    if (paused || veiled || !held.current) return
    const up = held.current
    held.current = null
    show(up)
  }, [paused, veiled, show])

  const motion = useRef({
    o: { x: 0, y: 0 },        // where the field's origin is on the screen
    c: { x: 0, y: 0 },        // the centre of the window
    lx: 0, ly: 0,             // where the light actually is, eased
    S0: 70,                   // the lattice pitch the window sets (pitchFor)
    S: 70, rowH: 70 * ROW,    // and the pitch the field is drawn at: S0 × zoom
    zoom: 1,                  // how far the field is opened out (ZOOM)
    zoomGoal: null,           // { z, fx, fy }: a zoom the loop is easing to
    pointers: new Map(),      // the fingers on the field, by pointer id
    pinch: null,              // two of them: { d0, z0, mx, my }
    wL: 0, hL: 0,             // the window the lens is drawn for (RESHAPE_PX)
    lens: lensFor(0, 0),      // the four ramps, for this window's shape
    wave: null,               // the veil's pulse, placed in this frame
    tap: null,                // a disc's pulse, in the lattice (readTap)
    bloom: 0,                 // 0 under the veil, 1 with the field at full
    v: { x: 0, y: 0 },        // the field's velocity, px/s
    heading: 0.6,             // where the drift is going
    drag: null, moved: 0,
    over: false, on: -1, kbd: false,
    px: 0, py: 0, pa: 0,      // the pointer, and how much of it is here
    goal: null,               // where a keyboard or a tap asked the field to go
    goalK: 170,               // and how quickly it goes there, in ms
    focus: null,              // { I, J, nd }
    slots: [],                // the pool (newSlot)
    bySlot: new Map(),        // a cell's key -> the slot it holds
    free: [],                 // slots holding nothing, by index
    stamp: 0,                 // the frame, for marking the slots in use
    sayW: 0, sayOn: 0,
    veiled, reduce, paused,
    ready: false,
  })
  motion.current.veiled = veiled
  motion.current.reduce = reduce
  motion.current.paused = paused

  // ── the lattice, in world units ──
  const worldX = useCallback((I, J, S) => (I + (J & 1) * 0.5) * S, [])
  const tileAt = useCallback((I, J) => lay.at[mod(J, lay.R) * lay.C + mod(I, lay.C)], [lay])
  // The fraction of the pitch this name's face fills. Log of the count, so the
  // first letter is most of the difference and the twentieth is none of it.
  const fracOf = useCallback((k) => {
    const t = names[k]
    if (!t) return DISC_MIN
    const f = Math.min(1, Math.log(1 + (t.count || 1)) / Math.log(1 + DISC_TOP))
    // a hair of variety off the handle's own hash, so two names written to
    // once are not identical objects
    const v = (((t.seed || 0) >>> 9) & 255) / 255 - 0.5
    return clamp(DISC_MIN + DISC_SPAN * f + v * 0.045, DISC_MIN - 0.03, 0.92)
  }, [names])
  const discOf = useCallback((k, S) => Math.round(S * fracOf(k)), [fracOf])

  // ── the window ──
  // Measured, and re-measured on resize, because everything here turns on it:
  // the pitch, how many slots there are to begin with, and where the light is.
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return undefined
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      const m = motion.current
      // the window the lens is drawn for: this one, unless the only thing
      // that changed is a browser bar (RESHAPE_PX, above)
      const reshaped = !m.ready
        || Math.abs(h - m.hL) > Math.max(RESHAPE_PX, m.hL * RESHAPE_SHARE)
        || Math.abs(w - m.wL) > 40
      if (reshaped) { m.wL = w; m.hL = h }
      const hL = m.hL
      // the window's pitch, and the pitch the field is drawn at: the same
      // thing until somebody pinches (ZOOM)
      const S0 = pitchFor(w, hL)
      const S = S0 * m.zoom
      const rowH = S * ROW
      // The pool is cut for the field a little more open than the window
      // draws it (ZOOM.pool), so the first frames need no slot it does not
      // have; from there it grows on demand (the loop, below), a slot at a
      // time and never handing a disc that is on the glass to another
      // element, and it never shrinks. A pool the screen never uses is a
      // pool the phone still pays for.
      const Sm = S0 * ZOOM.pool
      const pad = Sm * 0.6
      const Mx = Math.ceil((w + 2 * pad) / Sm) + 3
      const My = Math.ceil((Math.max(h, hL) + 2 * pad + HEADROOM) / (Sm * ROW)) + 3
      const was = { ...m.c }
      size.current = { w, h }
      m.c = { x: w / 2, y: hL / 2 }
      m.lens = lensFor(w, hL)
      if (!m.ready) {
        // the tile's middle cell starts in the light
        m.S0 = S0; m.S = S; m.rowH = rowH
        m.o = { x: m.c.x - worldX(lay.ic, lay.jc, S), y: m.c.y - lay.jc * rowH }
        m.lx = m.c.x; m.ly = m.c.y
        // A pointer that has been noticed but never located is at the middle
        // of the window, not at its top left corner. A mouse can enter this
        // element without ever moving inside it — it is under the cursor when
        // the page loads, or the cursor crossed it on the way to something
        // else — and (0, 0) as its position sends the whole lens, and the one
        // name on the field, into the corner.
        m.px = m.c.x; m.py = m.c.y
        m.ready = true
      } else if (m.S0 !== S0) {
        // a new pitch: keep the same cell in the light
        const f = m.focus
        m.S0 = S0; m.S = S; m.rowH = rowH
        if (f) m.o = { x: m.c.x - worldX(f.I, f.J, S), y: m.c.y - f.J * rowH }
      } else {
        // the same field, a different window: the light stays on what it had
        m.o.x += m.c.x - was.x
        m.o.y += m.c.y - was.y
      }
      // The pool, cut once, all of it free. A turn of the phone that needs
      // more is answered by the loop growing it, a slot at a time, and no
      // disc on the glass moves to another element for it.
      if (!m.slots.length) {
        const n = Mx * My
        m.slots = Array.from({ length: n }, newSlot)
        m.free = Array.from({ length: n }, (_, i) => n - 1 - i)
        setGrid(true)
        setAssign(new Array(n).fill(null))
      }
    }
    measure()
    const ro = window.ResizeObserver ? new ResizeObserver(measure) : null
    if (ro) ro.observe(el)
    return () => { if (ro) ro.disconnect() }
  }, [lay, worldX])

  const bind = useCallback((s, el) => {
    const slot = motion.current.slots[s]
    if (!slot) return
    slot.el = el
    slot.disc = el ? el.querySelector('.wl-cell-disc') : null
    // a new element has no transform on it yet, whatever the slot last wrote
    slot.tf = ''; slot.op = ''
  }, [])

  // ── the zoom, applied ──
  // One factor on the pitch, changed about a point on the glass so whatever
  // is under the fingers stays under them: the world scales with the pitch,
  // so the origin moves toward the focus by the same ratio. Anything the
  // field is carrying in world units, a travel's goal or a pulse's origin,
  // is scaled with it, so a pinch in the middle of either leaves it whole.
  const applyZoom = useCallback((z, fx, fy) => {
    const m = motion.current
    const k = z / m.zoom
    if (!(k > 0) || k === 1) return
    m.o.x = fx - (fx - m.o.x) * k
    m.o.y = fy - (fy - m.o.y) * k
    m.zoom = z
    m.S = m.S0 * z
    m.rowH = m.S * ROW
    if (m.goal) m.goal = { x: fx - (fx - m.goal.x) * k, y: fy - (fy - m.goal.y) * k }
    const t = m.tap
    if (t) { t.wx *= k; t.wy *= k; t.R *= k; t.rmax *= k }
  }, [])

  // ── the name on the plate ──
  // Read off the same two things the ring is drawn from — the focused cell's
  // key, and what the slot holding it was handed — rather than off the loop's
  // own `focus`, which is a frame ahead of both. Anything else and the plate
  // can name the disc beside the one it is pointing at.
  const reading = useMemo(() => {
    if (!focusKey) return ''
    const a = assign.find((x) => x && x.key === focusKey)
    const t = a ? names[a.k] || null : null
    return t ? atHandle(t.handle) : ''
  }, [focusKey, assign, names])

  // the plate's width, measured when the name in it changes, so the loop can
  // keep it inside the stage without reading layout every frame
  useLayoutEffect(() => {
    const el = say.current
    motion.current.sayW = el ? el.offsetWidth : 0
  }, [reading])

  // ── the loop ──
  // It runs while the field is on the screen. Under a sheet it idles: the
  // frame is asked for and nothing is drawn, so the crowd is where it was
  // when the sheet comes down. The one exception is a pulse or a travel
  // that is still going when the sheet rises, which is what a tap on a disc
  // leaves behind: those run out under the glass, because a crowd frozen in
  // the middle of a wave is a crowd that jumps when the sheet goes.
  useEffect(() => {
    if (!grid) return undefined
    let raf = 0
    let last = 0

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const m = motion.current
      const { w, h } = size.current
      if (!w || !h || !m.ready) return
      if (m.paused && !m.tap && !m.goal && !m.zoomGoal) { last = 0; return }
      const dt = last ? Math.min(64, now - last) : 16
      last = now
      const sec = dt / 1000
      const t = now / 1000

      // ── the zoom, settling ──
      // A pinch let go past a limit eases back to it, about the point it was
      // let go at. Under reduced motion it is simply there.
      if (m.zoomGoal) {
        const g = m.zoomGoal
        let nz = m.reduce ? g.z : m.zoom + (g.z - m.zoom) * (1 - Math.exp(-dt / 110))
        if (Math.abs(g.z - nz) < 0.0015) { nz = g.z; m.zoomGoal = null }
        applyZoom(nz, g.fx, g.fy)
      }

      // the field comes up to full over about a second as the veil lifts —
      // or, while the pulse is crossing it, disc by disc as the front
      // reaches each one (below)
      const want = m.veiled ? 0 : 1
      if (m.reduce) m.bloom = want
      else {
        m.bloom += (want - m.bloom) * (1 - Math.exp(-dt / 340))
        if (Math.abs(want - m.bloom) < 0.002) m.bloom = want
      }

      // ── the motion ──
      // Not while a finger is on it, or two. Otherwise the velocity relaxes
      // toward the drift, which is slow, wanders, and rests under a mouse; a
      // throw is the same velocity started high, so it coasts and eases back
      // into the drift rather than stopping. A keyboard's goal overrides all
      // of it.
      if (!m.drag && !m.pinch) {
        if (m.goal) {
          const k = 1 - Math.exp(-dt / (m.goalK || 170))
          m.o.x += (m.goal.x - m.o.x) * k
          m.o.y += (m.goal.y - m.o.y) * k
          m.v.x = 0; m.v.y = 0
          if (Math.abs(m.goal.x - m.o.x) < 0.4 && Math.abs(m.goal.y - m.o.y) < 0.4) { m.o = { ...m.goal }; m.goal = null }
        } else if (m.reduce) {
          m.v.x = 0; m.v.y = 0
        } else {
          // under a mouse the field keeps half its drift, and rests only on
          // a disc, so a name can be pressed without the crowd going still
          // the moment a pointer crosses it
          const hold = m.kbd || m.on >= 0 ? 0 : m.over ? 0.5 : 1
          if (hold === 1) m.heading += TURN * sec
          const ax = Math.cos(m.heading) * DRIFT * hold
          const ay = Math.sin(m.heading) * DRIFT * hold
          const k = 1 - Math.pow(RELAX, dt / 16.667)
          m.v.x += (ax - m.v.x) * k
          m.v.y += (ay - m.v.y) * k
          m.o.x += m.v.x * sec
          m.o.y += m.v.y * sec
        }
      }

      // ── where the light is ──
      // The middle of the window, leaning toward the pointer by a fraction of
      // how far away it is and never by more than a tenth of the screen. The
      // ease is slower on the way back than on the way in, so the crowd
      // follows a mouse and closes behind it rather than snapping flat.
      const cap = Math.min(w, h) * LEAN.cap
      const wantX = m.c.x + clamp((m.px - m.c.x) * LEAN.pull, -cap, cap) * m.pa
      const wantY = m.c.y + clamp((m.py - m.c.y) * LEAN.pull, -cap, cap) * m.pa
      if (m.reduce) { m.lx = wantX; m.ly = wantY } else {
        const k = 1 - Math.exp(-dt / 220)
        m.lx += (wantX - m.lx) * k
        m.ly += (wantY - m.ly) * k
      }
      // and how much of the pointer is here at all
      const wantA = m.over && !m.drag ? 1 : 0
      if (m.reduce) m.pa = wantA
      else m.pa += (wantA - m.pa) * (1 - Math.exp(-dt / (wantA ? 150 : 380)))

      // ── the draw ──
      const { S, rowH, slots, bySlot, free, lens } = m
      const pad = S * 0.6
      const lx = m.lx, ly = m.ly
      // The lens reaches the edge of the window and no further: the rim of the
      // screen is the rim of the lens on a spread. On a phone held upright it
      // is drawn taller than it is wide (lensFor), so the two long edges —
      // the edges a phone has — stand inside it rather than on its rim.
      // off the window the lens is drawn for, not the stage's height this
      // frame (measure, above)
      const Ry = m.c.y + S * 0.3
      const Rx = Math.max(m.c.x + S * 0.3, Ry * lens.side)
      const reach = S * TOUCH.reach
      const pa = m.pa
      // the pulses, if any are crossing the field, and how wide a crest is:
      // the veil's, sent from the tap that opened it, and a disc's, sent
      // from a name that was pressed
      const wv = m.reduce ? null : readWave(m, wave, stage.current)
      const tp = m.reduce ? null : readTap(m, now)
      const W = S * PULSE.width
      const I0 = Math.floor((-pad - m.o.x) / S - 0.5)
      const I1 = Math.ceil((w + pad - m.o.x) / S)
      const J0 = Math.floor((-pad - m.o.y) / rowH)
      const J1 = Math.ceil((h + pad - m.o.y) / rowH)
      let changed = null
      let best = null
      let bestAt = null
      let curNd = 3
      const f = m.focus

      // ── the seating, this frame ──
      // Every cell on the glass keeps the slot it had. The slots whose cells
      // have left the glass are given back, and the cells that have arrived
      // take them, a bounded number a frame, or take new ones if none are
      // free. So a slot changes hands only for a cell that has actually left
      // and one that has actually arrived, and nothing on the glass moves.
      const stamp = ++m.stamp
      let entering = null
      for (let J = J0; J <= J1; J++) {
        for (let I = I0; I <= I1; I++) {
          const s = bySlot.get(cellKey(I, J))
          if (s === undefined) (entering || (entering = [])).push(I, J)
          else slots[s].used = stamp
        }
      }
      for (let s = 0; s < slots.length; s++) {
        const slot = slots[s]
        if (slot.shown && slot.used !== stamp) {
          slot.shown = false
          bySlot.delete(slot.key)
          free.push(s)
          if (slot.el) slot.el.style.visibility = 'hidden'
        }
      }
      let grew = false
      if (entering) {
        // nearest the light first, so under a pinch the middle of the glass
        // is seated before the rim
        const cx = lx - m.o.x, cy = ly - m.o.y
        const order = []
        for (let i = 0; i < entering.length; i += 2) {
          const I = entering[i], J = entering[i + 1]
          order.push([Math.hypot(worldX(I, J, S) - cx, J * rowH - cy), I, J])
        }
        if (order.length > ASSIGN_PER_FRAME) order.sort((p, q) => p[0] - q[0])
        const n = Math.min(order.length, ASSIGN_PER_FRAME)
        for (let i = 0; i < n; i++) {
          const I = order[i][1], J = order[i][2]
          let s = free.pop()
          if (s === undefined) { s = slots.length; slots.push(newSlot()); grew = true }
          const slot = slots[s]
          const ax = worldX(I, J, S) + m.o.x
          const ay = J * rowH + m.o.y
          const u = Math.sqrt(((ax - lx) * (ax - lx)) / (Rx * Rx) + ((ay - ly) * (ay - ly)) / (Ry * Ry))
          slot.I = I; slot.J = J; slot.key = cellKey(I, J)
          slot.k = tileAt(I, J)
          slot.n = cellNoise(I, J)
          // the opening's ripple: each disc arrives by its distance from the
          // light, so the field fills from the middle outward
          slot.delay = Math.round(500 + Math.min(1.4, u) * 620)
          slot.shown = true
          slot.used = stamp
          // the element is reused for a new cell: nothing it last wrote holds
          slot.tf = ''; slot.op = ''
          bySlot.set(slot.key, s)
          ;(changed || (changed = [])).push(s)
          if (slot.el) slot.el.style.visibility = ''
        }
      }

      for (let J = J0; J <= J1; J++) {
        for (let I = I0; I <= I1; I++) {
          const s = bySlot.get(cellKey(I, J))
          if (s === undefined) continue
          const slot = slots[s]
          // where the lattice would put it, and how far that is from the light
          const ax = worldX(I, J, S) + m.o.x
          const ay = J * rowH + m.o.y
          const dx = ax - lx
          const dy = ay - ly
          const u = Math.sqrt((dx * dx) / (Rx * Rx) + (dy * dy) / (Ry * Ry))

          // SIZE: full inside the hold, then a smooth fall to the rim, and a
          // hair over full dead centre so the light has a point
          const e = clamp01((u - LENS.hold) / (1 - LENS.hold))
          const q = 1 - clamp01(u / LENS.hold)
          const zL = lens.rim + (1 - lens.rim) * Math.pow(1 - e, lens.fall) + (LENS.crown - 1) * q * q

          // how much of the lens applies to THIS disc: all of it once the
          // field is up, `veiled` under the masthead, and while the pulse is
          // crossing the field the full lens inside the front and the veiled
          // one outside it, over the width of the crest, so the lens is seen
          // to arrive with the light rather than on a clock of its own
          let bl = m.bloom
          if (wv) bl = clamp01(0.5 - (Math.hypot(ax - wv.x, ay - wv.y) - wv.R) / W)
          const L = LENS.veiled + (1 - LENS.veiled) * bl
          let z = 1 + (zL - 1) * L

          // SPACING: the lattice opens away from the light as it goes out
          const open = 1 + lens.open * Math.pow(e, LENS.openPow) * L
          let px = lx + dx * open
          let py = ly + dy * open

          // a name re-seated by a new reading of the index changes the disc
          // in place; the slot is the cell's whatever name the cell carries
          const k = tileAt(I, J)
          if (slot.k !== k) { slot.k = k; (changed || (changed = [])).push(s) }
          // the disc's size on the glass. The element is laid out at the
          // window's own pitch (`--d`, from S0) and the zoom rides on the
          // transform below, so a pinch never touches layout.
          const d = discOf(k, m.S0) * m.zoom

          // SLACK: what the packing left over, and the two ways a disc spends
          // it. Half the gap to the next disc, times how much of it we allow.
          const room = Math.max(0, (S * open - d * z) * 0.5 * LENS.slack)
          if (room > 0.2) {
            const n = slot.n
            const ang = ((n & 1023) / 1023) * TAU
            const mag = 0.35 + 0.65 * (((n >>> 10) & 1023) / 1023)
            px += Math.cos(ang) * room * mag
            py += Math.sin(ang) * room * mag
            if (!m.reduce) {
              // and its own breath, on its own clock, in its own direction
              const ph = (((n >>> 20) & 255) / 255) * TAU
              const w1 = TAU / (BREATH.slow + (((n >>> 28) & 15) / 15) * (BREATH.fast - BREATH.slow))
              const amp = room * BREATH.amp
              px += Math.sin(t * w1 + ph) * amp
              py += Math.cos(t * w1 * 0.77 + ph * 1.7) * amp
            }
          }

          // THE POINTER: a second, smaller light. What is under it swells, and
          // the crowd parts to make the room that swelling needs — nothing at
          // the very middle, so the disc you are on does not run away from you.
          if (pa > 0.002) {
            const bx = px - m.px
            const by = py - m.py
            const r = Math.sqrt(bx * bx + by * by)
            const g = Math.exp(-(r * r) / (reach * reach))
            if (g > 0.004) {
              z *= 1 + TOUCH.swell * g * pa
              const push = TOUCH.part * S * g * pa * Math.min(1, r / reach)
              if (r > 0.01) { px += (bx / r) * push; py += (by / r) * push }
            }
          }

          // THE PULSES: a crest passes through (`crest`, above). The veil's,
          // and a pressed disc's, and when both are on the field a disc
          // under both is moved by both.
          let lift = 0
          if (wv) {
            const c = crest(wv, ax, ay, S, W, open, d, z)
            if (c) { z = c.z; px += c.dx; py += c.dy; lift = c.lift }
          }
          if (tp) {
            const c = crest(tp, ax, ay, S, W, open, d, z)
            if (c) { z = c.z; px += c.dx; py += c.dy; lift = Math.max(lift, c.lift) }
          }

          const isFocus = f && f.I === I && f.J === J
          if (slot.disc) {
            // written only when it has moved: every inline write is a style
            // recalculation for that element on the frame, and the far discs
            // barely move between two frames
            const tf = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${(z * m.zoom).toFixed(3)})`
            if (tf !== slot.tf) { slot.tf = tf; slot.disc.style.transform = tf }
            // ── air ──
            // The far discs are not only smaller, they are further away, and
            // the one thing distance does to a face that scale alone does not
            // is take light off it. The ramp is off the same `z` everything
            // else is off, so a disc that is half the size is also half the
            // way into the room. Without it the rim reads as small faces on
            // the same plane as the near ones, which is a diagram.
            const air = Math.min(1, lens.air + (1 - lens.air) * clamp01((z - lens.rim) / (1 - lens.rim)) + lift)
            const op = air > 0.995 ? '1' : air.toFixed(2)
            if (op !== slot.op) { slot.op = op; slot.disc.style.opacity = op }
          }
          // how far the pointer is from this disc, in its own drawn place: the
          // plate goes on whoever is nearest it, and on a phone, where there is
          // no pointer, on whoever is nearest the middle
          const sx = px - (pa > 0.5 ? m.px : m.c.x)
          const sy = py - (pa > 0.5 ? m.py : m.c.y)
          const nd = Math.sqrt(sx * sx + sy * sy) / S
          if (isFocus) curNd = nd
          if (!best || nd < best.nd) { best = { I, J, nd }; bestAt = { x: px, y: py, r: d * z * 0.5 } }
        }
      }
      // ── the person the lens is reading ──
      // The nearest disc, with a little hysteresis so two at the same distance
      // do not hand the plate back and forth.
      if (best && (!f || curNd > 2.4 || best.nd < curNd - 0.08)) {
        if (!f || f.I !== best.I || f.J !== best.J) {
          m.focus = best
          setFocusKey(`${best.I},${best.J}`)
        } else {
          m.focus = best
        }
      } else if (f) {
        f.nd = curNd
      }

      // ── the plate ──
      // One element, under the disc it names, held inside the stage. It is on
      // when the field is up and there is somebody to name; it is off under
      // the veil, off while the field is being thrown, and off on a disc so
      // far from the light that naming it would be pointing at nothing.
      if (say.current) {
        const on = !m.veiled && bestAt && best && best.nd < 1.6 && !m.drag && !m.pinch ? 1 : 0
        if (bestAt) {
          const half = m.sayW / 2 + 10
          const x = clamp(bestAt.x, half, Math.max(half, w - half))
          let y = bestAt.y + bestAt.r + 15
          if (y > h - 34) y = bestAt.y - bestAt.r - 34
          say.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`
        }
        if (on !== m.sayOn) { m.sayOn = on; say.current.classList.toggle('is-on', !!on) }
      }

      if (changed || grew) {
        setAssign((prev) => {
          const next = prev.length < slots.length ? prev.concat(new Array(slots.length - prev.length).fill(null)) : prev.slice()
          for (const s of changed || []) {
            const slot = slots[s]
            next[s] = { I: slot.I, J: slot.J, k: slot.k, key: `${slot.I},${slot.J}`, delay: slot.delay }
          }
          return next
        })
      }
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf) }
  }, [grid, names, tileAt, worldX, discOf, wave, applyZoom])

  // ── the pull, and the pinch ──
  // Listeners go on the window rather than through pointer capture. Capture
  // would redirect the click to the element that captured it, and every disc
  // in here is a button whose whole job is to be tapped. One set of them,
  // put on when the first finger lands and taken off when the last one
  // lifts, so a second finger joins the gesture instead of starting one.
  //
  // One finger pulls. A second finger turns the pull into a pinch: the field
  // is opened out or closed up about the point between the two, by the ratio
  // of the distance between them to what it was when the second landed, and
  // it goes on following the midpoint, so a pinch that drifts is a pan as
  // well. Past a limit the pinch is rubber banded (bandZoom), and when it is
  // let go the zoom eases back to the limit. Lift one finger and the other
  // is a pull again, from where it is. A pinch is never a tap.
  const onDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const m = motion.current
    if (!m.ready) return
    const pts = m.pointers
    const first = pts.size === 0
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.size === 1) {
      m.drag = { x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now(), vx: 0, vy: 0 }
      m.moved = 0
      m.goal = null
      m.zoomGoal = null
      if (stage.current) stage.current.classList.add('is-held')
    } else if (pts.size === 2 && e.pointerType !== 'mouse') {
      const [a, b] = [...pts.values()]
      m.pinch = {
        d0: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)), z0: m.zoom,
        mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
      }
      m.drag = null
      m.moved = SLOP + 1
      m.v = { x: 0, y: 0 }
      m.goal = null
      m.zoomGoal = null
    }
    if (!first) return

    const focal = (x, y) => {
      const r = stage.current ? stage.current.getBoundingClientRect() : { left: 0, top: 0 }
      return { fx: x - r.left, fy: y - r.top }
    }
    const move = (ev) => {
      const p = pts.get(ev.pointerId)
      if (p) { p.x = ev.clientX; p.y = ev.clientY }
      const pinch = m.pinch
      if (pinch) {
        if (pts.size < 2) return
        const [a, b] = [...pts.values()]
        const dist = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        // the pan first, so the zoom is taken about where the fingers are now
        m.o.x += mx - pinch.mx
        m.o.y += my - pinch.my
        pinch.mx = mx; pinch.my = my
        const { fx, fy } = focal(mx, my)
        applyZoom(bandZoom(pinch.z0 * (dist / pinch.d0)), fx, fy)
        return
      }
      const d = m.drag
      if (!d) return
      const dx = ev.clientX - d.x
      const dy = ev.clientY - d.y
      const t = ev.timeStamp || performance.now()
      const dt = Math.max(1, t - d.t)
      m.moved += Math.abs(dx) + Math.abs(dy)
      m.o.x += dx
      m.o.y += dy
      // a smoothed velocity, so the throw is the shape of the whole gesture
      d.vx = d.vx * 0.7 + (dx / dt) * 1000 * 0.3
      d.vy = d.vy * 0.7 + (dy / dt) * 1000 * 0.3
      d.x = ev.clientX; d.y = ev.clientY; d.t = t
    }
    const up = (ev) => {
      pts.delete(ev.pointerId)
      const done = pts.size === 0
      if (done) {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        if (stage.current) stage.current.classList.remove('is-held')
      }
      if (m.pinch) {
        if (pts.size >= 2) return
        // the pinch ends: back inside the limits if it was let go past them,
        // and the finger that is left, if one is, has the field
        const pinch = m.pinch
        m.pinch = null
        const z = clamp(m.zoom, ZOOM.min, ZOOM.max)
        if (z !== m.zoom) {
          const { fx, fy } = focal(pinch.mx, pinch.my)
          if (m.reduce) applyZoom(z, fx, fy)
          else m.zoomGoal = { z, fx, fy }
        }
        m.v = { x: 0, y: 0 }
        if (!done) {
          const [rest] = [...pts.values()]
          m.drag = { x: rest.x, y: rest.y, t: ev.timeStamp || performance.now(), vx: 0, vy: 0 }
        }
        return
      }
      if (!done) return
      const d = m.drag
      m.drag = null
      if (m.reduce || !d) { m.v = { x: 0, y: 0 }; return }
      // the throw: the gesture's own velocity, and the loop eases it back
      // into the drift
      m.v = { x: Math.max(-FLING, Math.min(FLING, d.vx)), y: Math.max(-FLING, Math.min(FLING, d.vy)) }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [applyZoom])

  // A wheel or a trackpad pans the field, in both axes, the way a map pans;
  // with ctrl held, which is also what a trackpad's pinch arrives as, it
  // zooms about the pointer, inside the limits. Safari sends its trackpad
  // pinch as its own gesture events and would zoom the page with them, so
  // those are taken too. Attached again when the names arrive, because the
  // empty wall is a different element.
  const has = names.length > 0
  useEffect(() => {
    const el = stage.current
    if (!el || !has) return undefined
    const at = (e) => {
      const r = el.getBoundingClientRect()
      return { fx: e.clientX - r.left, fy: e.clientY - r.top }
    }
    const onWheel = (e) => {
      const m = motion.current
      if (m.veiled || !m.ready) return
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const { fx, fy } = at(e)
        m.zoomGoal = null
        applyZoom(clamp(m.zoom * Math.exp(-e.deltaY * ZOOM.wheel), ZOOM.min, ZOOM.max), fx, fy)
        return
      }
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.current.h : 1
      m.o.x -= e.deltaX * k
      m.o.y -= e.deltaY * k
      m.goal = null
    }
    let gz = 1
    const onGestureStart = (e) => { e.preventDefault(); gz = motion.current.zoom }
    const onGestureChange = (e) => {
      const m = motion.current
      e.preventDefault()
      if (m.veiled || !m.ready) return
      const { fx, fy } = at(e)
      m.zoomGoal = null
      applyZoom(clamp(gz * (e.scale || 1), ZOOM.min, ZOOM.max), fx, fy)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart, { passive: false })
    el.addEventListener('gesturechange', onGestureChange, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart)
      el.removeEventListener('gesturechange', onGestureChange)
    }
  }, [has, applyZoom])

  // ── the pointer ──
  // Where it is, in the stage's own coordinates, every move. A finger never
  // gets here: it has the pull, and a bulge under a fingertip is a bulge
  // under the one thing on the screen you cannot see past.
  const onMove = useCallback((e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    const el = stage.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const m = motion.current
    m.px = e.clientX - r.left
    m.py = e.clientY - r.top
    m.over = true
  }, [])

  // Under a mouse the field slows, and over a disc it rests, so a name can
  // be pressed.
  const onHover = useCallback((s, e) => {
    if (e && e.pointerType && e.pointerType !== 'mouse') return
    motion.current.on = s
  }, [])
  const onOver = useCallback((on) => (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    const m = motion.current
    m.over = on
    // an enter carries a position, and it is the only one there is until the
    // pointer actually moves in here
    if (on && stage.current && typeof e.clientX === 'number') {
      const r = stage.current.getBoundingClientRect()
      m.px = e.clientX - r.left
      m.py = e.clientY - r.top
    }
    if (!on) m.on = -1
  }, [])

  // A keyboard walking the names brings each into the light as it lands.
  const onFocusIn = useCallback((e) => {
    const m = motion.current
    const btn = e.target.closest ? e.target.closest('.wl-cell') : null
    if (!btn) return
    m.kbd = true
    let visible
    try { visible = btn.matches(':focus-visible') } catch { visible = false }
    if (!visible) return
    const s = Number(btn.dataset.slot)
    const slot = m.slots[s]
    if (!slot || Number.isNaN(slot.I)) return
    m.goal = { x: m.c.x - worldX(slot.I, slot.J, m.S), y: m.c.y - slot.J * m.rowH }
    m.goalK = 170
    if (m.reduce) { m.o = { ...m.goal }; m.goal = null }
  }, [worldX])
  const onFocusOut = useCallback((e) => {
    const m = motion.current
    if (e.relatedTarget && stage.current && stage.current.contains(e.relatedTarget)) return
    m.kbd = false
  }, [])

  // ── the pulse from a disc ──
  // The same wave the veil's tap sends through the crowd, sent from one
  // disc, and the field travelling to put that disc in the light. The origin
  // is the cell's own place in the lattice, so the ring stays on the person
  // as they come to the middle; the reach is to the farthest corner of the
  // glass from where they stand now. By cell rather than by slot, because
  // the wall sends one from a name that may not have a slot yet.
  const tapCell = useCallback((I, J) => {
    const m = motion.current
    const { w, h } = size.current
    if (!m.ready || !w || !h) return false
    const wx = worldX(I, J, m.S)
    const wy = J * m.rowH
    const x = wx + m.o.x
    const y = wy + m.o.y
    const rmax = Math.hypot(Math.max(x, w - x), Math.max(y, h - y))
    const now = performance.now()
    m.tap = {
      wx, wy, x, y, R: 0, amp: 0, rmax, t0: now,
      ms: clamp(TAP_BASE + rmax * TAP_PER_PX, TAP_MIN, TAP_MAX),
    }
    m.goal = { x: m.c.x - wx, y: m.c.y - wy }
    m.goalK = CENTRE_K
    m.v = { x: 0, y: 0 }
    return true
  }, [worldX])
  const tapAt = useCallback((slot) => (
    slot && !Number.isNaN(slot.I) ? tapCell(slot.I, slot.J) : false
  ), [tapCell])

  // ── the press ──
  // A press that travelled swallows the tap it would have ended in, because
  // every disc is a target and nothing is worse than a surface that opens a
  // letter because you tried to look past it. A press that did not hands
  // the disc's own circle, where it is standing now, to the letter, which
  // opens out of it at once (morph.js, screens/Letter.jsx), and sends the
  // pulse out from the disc under the glass so the name is in the light
  // when the sheet comes down. Under reduced motion nothing travels.
  const open = useCallback((handle, e) => {
    const m = motion.current
    if (m.moved > SLOP) return
    const btn = e && e.currentTarget ? e.currentTarget : null
    const disc = btn ? btn.querySelector('.wl-cell-disc') : null
    const slot = btn ? m.slots[Number(btn.dataset.slot)] : null
    if (disc) takeOff(handle, disc.getBoundingClientRect())
    if (!m.reduce) tapAt(slot)
    if (onOpen) onOpen(handle)
  }, [onOpen, tapAt])

  // ── the wall's own hand on the field ──
  // `pulse(handle)`: the same pulse and the same travel, sent from a name's
  // disc by the screen rather than by a finger. The wall sends one for the
  // name a letter was just put up to, once the composer's glass has gone,
  // wherever on the field that name sits: its seat is found in the tile, at
  // the repeat of the torus nearest the middle of the glass, and if that is
  // off the glass the field travels there first and the pulse leaves the
  // disc once it is on. Nothing is opened.
  const late = useRef(0)
  useEffect(() => () => clearTimeout(late.current), [])
  const pulse = useCallback((handle) => {
    const m = motion.current
    const h = String(handle || '')
    if (!h || m.veiled || m.reduce || !m.ready) return false
    const k = names.findIndex((t) => t.handle === h)
    if (k < 0) return false
    const { w, h: hh } = size.current
    const { C, R, at } = lay
    const cx = m.c.x - m.o.x
    const cy = m.c.y - m.o.y
    const PX = C * m.S
    const PY = R * m.rowH
    let best = null
    for (let j = 0; j < R; j++) {
      for (let i = 0; i < C; i++) {
        if (at[j * C + i] !== k) continue
        // R is even, so J has j's parity and the row's half-pitch offset holds
        const J = j + R * Math.round((cy - j * m.rowH) / PY)
        const I = i + C * Math.round((cx - worldX(i, J, m.S)) / PX)
        const d = Math.hypot(worldX(I, J, m.S) - cx, J * m.rowH - cy)
        if (!best || d < best.d) best = { I, J, d }
      }
    }
    if (!best) return false
    clearTimeout(late.current)
    const x = worldX(best.I, best.J, m.S) + m.o.x
    const y = best.J * m.rowH + m.o.y
    if (x > -m.S && x < w + m.S && y > -m.S && y < hh + m.S) return tapCell(best.I, best.J)
    m.goal = { x: m.c.x - worldX(best.I, best.J, m.S), y: m.c.y - best.J * m.rowH }
    m.goalK = CENTRE_K
    m.v = { x: 0, y: 0 }
    late.current = window.setTimeout(() => { late.current = 0; tapCell(best.I, best.J) }, TRAVEL_FIRST_MS)
    return true
  }, [names, lay, worldX, tapCell])
  useImperativeHandle(ref, () => ({ pulse }), [pulse])

  // ── where a name's disc is standing ──
  // For the letter on its way out (morph.js `locate`): the disc's rectangle
  // on the glass, if that name is drawn and inside the glass by its own
  // width, so a card never closes into a disc that is dissolving at the rim
  // or standing under the bar. Left in morph.js while the field is mounted,
  // taken back when it is not.
  useEffect(() => {
    setLocator((handle) => {
      const m = motion.current
      const h = String(handle || '')
      if (!h || m.veiled || !stage.current) return null
      const { w, h: hh } = size.current
      const sr = stage.current.getBoundingClientRect()
      for (const slot of m.slots) {
        if (!slot.shown || slot.k < 0 || !slot.disc) continue
        const t = names[slot.k]
        if (!t || t.handle !== h) continue
        const r = slot.disc.getBoundingClientRect()
        if (!r.width) return null
        const cx = r.left + r.width / 2 - sr.left
        const cy = r.top + r.height / 2 - sr.top
        if (cx < r.width || cx > w - r.width || cy < r.height || cy > hh - r.height) return null
        return { x: r.left, y: r.top, w: r.width, h: r.height }
      }
      return null
    })
    return () => setLocator(null)
  }, [names])

  // Nothing to draw: the line the caller gives, which is empty while the
  // index is still loading or did not load, since either of those said so
  // already in the ear and neither is an empty wall.
  if (!names.length) {
    return (
      <div className="wl-hive is-empty" ref={stage}>
        {none ? <Label tone="dim" className="wl-hive-none">{none}</Label> : null}
      </div>
    )
  }

  // the pitch the cells are laid out at: the window's own, whatever the
  // zoom, which rides on the loop's transform (applyZoom)
  const S = motion.current.S0
  return (
    <div
      className={`wl-hive${veiled ? ' is-veiled' : ''}`}
      ref={stage}
      onPointerDown={veiled ? undefined : onDown}
      onPointerMove={veiled ? undefined : onMove}
      onPointerEnter={onOver(true)}
      onPointerLeave={onOver(false)}
      onFocusCapture={onFocusIn}
      onBlurCapture={onFocusOut}
      inert={veiled || undefined}
      role="group"
      aria-label="the names on the wall, drag to move through them"
    >
      {/* ── the crowd, and the mask ──
          The faces are inside their own layer because the mask that dissolves
          the field at its edges must not also dissolve the plate naming
          somebody, and under a pointer near the rim that is exactly where the
          plate is standing. */}
      <div className="wl-hive-crowd">
      {assign.map((a, s) => {
        // a slot can be a frame behind the names it draws from, so the name
        // is looked up rather than trusted
        const t = a ? names[a.k] || null : null
        return (
          <Cell
            key={s}
            s={s}
            handle={t ? t.handle : ''}
            count={t ? t.count : 0}
            d={t ? Math.round(S * fracOf(a.k)) : 0}
            /* nobody is being read while the masthead is over the field:
               the ring and the halo are the mark of the one person the wall
               is naming, and under the veil the wall is naming nobody */
            focus={!!t && !veiled && a.key === focusKey}
            mine={!!t && wrote.has(t.handle)}
            fresh={!!t && !!fresh && fresh.has(t.handle)}
            delay={opening && t ? a.delay : 0}
            bind={bind}
            onOpen={open}
            onHover={onHover}
            onPeek={onPeek}
          />
        )
      })}
      </div>
      {/* ── the one name on the field ──
          Not sixty plates fading past each other under a moving pointer: one
          element, moved, carrying whoever the lens is reading. */}
      <div className="wl-hive-say" ref={say} aria-hidden="true">
        <span className="wl-hive-say-h">{reading}</span>
      </div>
    </div>
  )
}

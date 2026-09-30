// ── the red thread ──────────────────────────────────────────────────────────
// The old story that two people who are meant to meet are tied by a red
// thread, little finger to little finger, however far apart they stand and
// whether or not they know it. Here they do not know it. He stands at the
// left edge of the glass and she at the right, each facing away, and a
// thread in the rose runs from his hand, slack along the ground, to hers.
// It tugs: a ripple runs along it from him to her, and she feels it and
// turns round; it runs back, and he turns. They walk toward each other,
// and the thread comes up off the ground between them as it shortens. Their
// hands meet in the middle, and the thread rises out of their joined hands
// in a loop over them, turning, and settles into the ring, in the rose, as
// the pink goes out from their hands; the two of them gather into the star.
//
//      0   the two of them apart, facing away; the thread on the ground
//    700   the tug, his end to hers
//   1300   she turns; the ripple runs back
//   2000   he turns
//   2250   they walk toward each other
//   3500   their hands meet
//   3650   the thread rises into a loop over them
//   4150   the pink, from their hands
//   4350   the loop into the ring, the two of them into the star

import {
  Pad, figure, mark, glideOf, tale, INK, ROSE, lerp, smooth, inOut, span,
} from './kit.js'

const G = 64
const S = 1.3
const HIM0 = 15
const HER0 = 80
const HIM1 = 41
const HER1 = 54
const TUG = [700, 1350]
const SHE_TURNS = [1250, 1550]
const BACK = [1450, 2100]
const HE_TURNS = [1950, 2250]
const WALK = [2250, 3500]
const HANDS = [3300, 3600]
const RISE = [3650, 4700]
const WASH_AT = 4150
const MORPH = 4350

// a turn round: through facing us (from behind, `turn` 1) half way, the
// way the figure faces flipping there
function turning(t, [a, b], from, to) {
  const k = span(t, a, b)
  return { dir: k < 0.5 ? from : to, turn: Math.sin(Math.PI * k) * 0.9 }
}

function pose(t) {
  const w = span(t, ...WALK)
  const e = inOut(w)
  const pace = w > 0 && w < 1 ? Math.min(1, Math.sin(Math.PI * w) * 1.6) : 0
  const hands = smooth(span(t, ...HANDS))
  return {
    him: { x: lerp(HIM0, HIM1, e), ...turning(t, HE_TURNS, -1, 1), walk: (t - WALK[0]) / 820, stride: 0.8 * pace, hands },
    her: { x: lerp(HER0, HER1, e), ...turning(t, SHE_TURNS, 1, -1), walk: (t - WALK[0]) / 760 + 0.5, stride: 0.8 * pace, hands },
  }
}

function people(pad, t, a = 1) {
  const p = pose(t)
  const mid = [(HIM1 + HER1) / 2 + 0.2, G - 20]
  const her = figure(pad, {
    her: true, ribbon: true, x: p.her.x, g: G, s: S * 0.93, dir: p.her.dir, turn: p.her.turn,
    walk: p.her.walk, stride: p.her.stride, a,
    reach: p.her.hands > 0.01 ? [[lerp(p.her.x - 3, mid[0] + 0.4, p.her.hands), lerp(G - 17, mid[1], p.her.hands)], null] : null,
    tilt: 5 * p.her.hands,
  })
  const him = figure(pad, {
    x: p.him.x, g: G, s: S, dir: p.him.dir, turn: p.him.turn, walk: p.him.walk, stride: p.him.stride, a,
    reach: p.him.hands > 0.01 ? [[lerp(p.him.x + 3, mid[0] - 0.4, p.him.hands), lerp(G - 18, mid[1], p.him.hands)], null] : null,
    tilt: -4 * p.him.hands,
  })
  return { him, her, mid }
}

// the thread, as points from his hand (s 0) to hers (s 1)
function threadAt(t, A, B, M) {
  const w = inOut(span(t, ...WALK))
  const rise = span(t, ...RISE)
  const tug = span(t, ...TUG)
  const back = span(t, ...BACK)
  const out = []
  const N = 360
  // where their hands meet, and the angle of the ring there (its lowest
  // stretch, nearest the hands), so the loop starts and ends in their hands
  let thH = Math.PI / 2
  let best = Infinity
  for (let k = 0; k < 64; k++) {
    const th = (k / 64) * Math.PI * 2
    const [x, y] = M.at(th)
    const d = (x - (A[0] + B[0]) / 2) ** 2 + (y - (A[1] + B[1]) / 2) ** 2
    if (d < best) { best = d; thH = th }
  }
  const e = inOut(rise)
  for (let i = 0; i <= N; i++) {
    const s = i / N
    // lying slack: down to the ground and along it, a curl or two in it,
    // coming up off the ground as they walk it shorter
    const sag = lerp(26, 9, w)
    let x = lerp(A[0], B[0], s)
    let y = lerp(A[1], B[1], s) + sag * Math.sin(Math.PI * s) ** 0.6
    const env = Math.sin(Math.PI * s) * (1 - w * 0.85)
    x += 2.2 * Math.sin(s * Math.PI * 6 + t * 0.0012) * env
    y += 0.9 * Math.cos(s * Math.PI * 6 + t * 0.0012) * env
    // the tug, and the tug back: a ripple running along it
    if (tug > 0 && tug < 1) y -= 10 * Math.exp(-(((s - tug) / 0.08) ** 2)) * Math.sin(Math.PI * tug) ** 0.5
    if (back > 0 && back < 1) y -= 10 * Math.exp(-(((s - (1 - back)) / 0.08) ** 2)) * Math.sin(Math.PI * back) ** 0.5
    y = Math.min(y, G - 0.6)
    if (e > 0) {
      // rising out of their hands in a loop, turning a little as it opens
      const spin = (1 - e) * 1.1
      const [lx, ly] = M.at(thH + s * 2 * Math.PI + spin * Math.sin(Math.PI * s))
      x = lerp(x, lx, e)
      y = lerp(y, ly, e)
    }
    out.push([x, y])
  }
  return out
}

export function threadStory() {
  const pad = new Pad()
  const src = new Pad()
  let glide = null
  const prep = (ms) => {
    if (typeof document === 'undefined') return
    if (!glide) {
      const M = mark()
      src.clear()
      const { mid } = people(src, MORPH)
      const from = src.cells().filter((c) => c[4] >= 0.2)
      glide = glideOf(from, M.star.map((p) => [p.x, p.y]), { delay: (p) => Math.hypot(p[0] - mid[0], p[1] - mid[1]) * 7, flight: 650, bend: 2.4 })
    }
    glide.step(ms)
  }
  const end = MORPH + 1200
  const draw = (t) => {
    const M = mark()
    pad.clear()
    const ground = 1 - smooth(span(t, MORPH - 200, MORPH + 300))
    for (let x = -6; x < 101; x++) if (((x % 4) + 4) % 4 !== 3) pad.set(x, G, INK, 0.45 * ground)
    // (past the gathering, the hands the thread rose from are where they
    // were on its first frame)
    const { him, her } = t < MORPH ? people(pad, t) : people(src.clear(), MORPH)
    const hands = [him.hand[0], her.hand[0]]
    // the thread, over them
    const done = span(t, RISE[1], RISE[1] + 250)
    if (done < 1) {
      const pts = threadAt(t, hands[0], hands[1], M)
      for (const [x, y] of pts) pad.set(x, y, ROSE, 1 - done)
    }
    const cells = pad.cells()
    if (done > 0) for (const p of M.ring) cells.push([p.x, p.y, ROSE, 0, done])
    if (t >= MORPH) {
      prep(Infinity)
      glide.at(t - MORPH, cells)
    }
    return { cells }
  }
  return tale({ end, draw, prep, wash: { at: WASH_AT, x: 47, y: 44, ms: 1300 } })
}

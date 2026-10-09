// ── the bloom ───────────────────────────────────────────────────────────────
//
// What happens to the notes' light in the panel, as one idea: a flower that
// opens only at night. Every note that waits keeps a closed bud of its own
// light; at nine the two envelopes come apart into the petals of one flower;
// lin's letter rises out of its heart, parts its petals as it goes and turns
// them as it turns over; kai's letter is given back to it a pixel at a time;
// and it closes. The ones that never meet keep their buds shut and fold them
// away, and for the name a bud opens one last time into the mark's star.
//
// How it moves, and why (design/campaign/BRIEF.md has the plan's sources):
//   the petals start at golden-angle steps (Vogel's phyllotaxis) and open
//   as a spiral bud untwists (the moonflower), slow in and slow out and a
//   little past and back, one after another (overlapping action), over about
//   a second and a quarter: never thrown out from a point, which is how an
//   explosion moves. The rim leads, as a lily's edges do. It starts on the
//   frame the envelopes touch, from where they touch (the launching effect),
//   and their pixels go out in streams, a stream to a petal (common fate),
//   so it reads as the note becoming a flower. Nothing rises; nothing
//   flickers. Each petal hangs on a spring, so the letter going past it and
//   turning over moves it, and it settles back.
//
// Everything here is a function of the film's moment and nothing else: the
// petals' swing is worked out once, a step at a time from the touch, and
// read back; every pixel's way is a curve in time.
import { S } from './reel-time.js'
import { MAXP, MAXPTS, PETAL } from './panel-fluid.js'

const TAU = Math.PI * 2
const GOLD = Math.PI * (3 - Math.sqrt(5))
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const u = (t, a, b) => clamp((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const rnd = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
const smooth = (a, b, x) => { const k = u(x, a, b); return k * k * (3 - 2 * k) }
const sineIO = (k) => -(Math.cos(Math.PI * k) - 1) / 2
const expoOut = (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k))
const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU)
const mixed = (a, b, k) => a.map((x, i) => x * (1 - k) + b[i] * k)
const times = (rgb, k) => rgb.map((x) => x * k)

// a spring let go towards 1, `dt` seconds on, at `f` cycles a second and
// damped by `z`: it starts slowly, goes a little past, and settles
export function spring(dt, f = 0.72, z = 0.82) {
  if (dt <= 0) return 0
  const w = TAU * f
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * dt) * (Math.cos(wd * dt) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * dt))
}

// a petal's half width along it, 0 at its heart to 1 at its end: a petal's
// is narrow at the heart, widest two thirds out and round at its end; a
// star's point is widest near the heart and comes to a point
const ROUND = (s) => { s = clamp(s); return (s ** 0.8 * Math.sqrt(Math.max(0, 1 - s ** 4))) / 0.66 }
const POINTED = (s) => { s = clamp(s); return Math.sin(Math.PI * s ** 0.72) ** 0.85 }

// the point on a petal's rim `s` along it, on its `side` (1 or -1)
export function rimOf(p, s, side) {
  const r = s * p.L
  const hw = p.hw * (p.pointed ? POINTED(s) : ROUND(s)) * 0.86
  const a = p.th + p.bend * s + side * Math.asin(Math.min(0.95, hw / Math.max(r, 1)))
  return [p.x + r * Math.cos(a), p.y + r * Math.sin(a)]
}

// the light of petals at a point, as the panel's shader sums it, for the
// letter's edges
function lightAtPoint(petals, hearts, x, y) {
  const out = [0, 0, 0]
  for (const p of petals) {
    const dx = x - p.x
    const dy = y - p.y
    const r = Math.hypot(dx, dy) + 1e-4
    if (r > p.L * 1.02 || p.a <= 0) continue
    const s = r / p.L
    const dd = wrap(Math.atan2(dy, dx) - (p.th + p.bend * s))
    if (Math.cos(dd) <= 0) continue
    const lat = Math.abs(r * Math.sin(dd) * (1 + p.lean * Math.sign(Math.sin(dd))))
    const sc = clamp(s)
    const hw = p.hw * (p.pointed ? POINTED(sc) : ROUND(sc)) * (1 + p.ruff * Math.sin(TAU * 2.5 * sc + p.ph)) + 0.5
    const fill = 1 - smooth(0.7 * hw, hw, lat)
    const e = (lat - 0.9 * hw) / (0.06 * hw + 1.2)
    const rim = lat <= 1.12 * hw ? Math.exp(-e * e) : 0
    const drawn = 1 - smooth(p.front - 0.02, p.front + 0.07, s)
    const a = (0.13 * fill * p.veil * (0.5 + 0.5 * drawn) + rim * (0.38 + 0.62 * drawn) * (0.45 + 0.55 * sc)) * (1 - smooth(0.93, 1, s)) * smooth(0.08, 0.3, s)
    for (let i = 0; i < 3; i++) out[i] += a * p.a * p.col[i]
  }
  for (const h of hearts) {
    const k = Math.exp(-((x - h[0]) ** 2 + (y - h[1]) ** 2) / (h[2] * h[2])) * h[3]
    for (let i = 0; i < 3; i++) out[i] += k * h[4 + i]
  }
  return out
}

// `d`: what the reel knows that the bloom needs. The letter's way and its
// corners (`cardAt`, `cardQuad`, `quadMap`, `flipEase`), the camera on the
// panel (`panelView`, `toPanel`), where the notes are (`pairAt`, `TOUCHED`,
// `MEET`, `REST_AT` the letter held, `L_AT`, `K_AT`, `LENS`, `OTHERS`,
// `LONE`, `STAR`), the envelope's cells (`ENV_ROWS`), the grid's cell `C`,
// the letter's size (`PW`, `CARD_H`), `breath`, and `light(tint)`, a
// note's glow and its lit colour in linear light
export function makeBloom(d) {
  const { C } = d
  const ICE = d.light('ice')
  const AMBER = d.light('amber')
  const petalCol = (L) => mixed(L.glow, L.lit, 0.25)
  const ICE_P = petalCol(ICE)
  const AMBER_P = petalCol(AMBER)
  const MUTUAL = mixed(ICE.lit, AMBER.lit, 0.5).map((x) => x * 0.95)
  const WARM = [1, 0.93, 0.86]

  // ── the flower at nine ──
  // thirteen petals, each a golden angle on from the last, lin's on the
  // left of where the two touched and kai's on the right, the first the
  // longest; each a little different in reach, width and fullness
  const NP = 13
  const T0 = S.touch[2] + 10
  const CLOSE = 24450
  const MAIN = Array.from({ length: NP }, (_, k) => {
    const th = -Math.PI / 2 - 0.35 + k * GOLD
    const L = 545 * (1 - 0.03 * k) * (0.92 + 0.16 * rnd(k + 41))
    const who = Math.cos(th) < 0 ? 0 : 1
    return { k, th, L, W: 0.34 * L * (0.88 + 0.24 * rnd(k + 47)), lean: 0.12 * (rnd(k + 53) - 0.5), who, t0: T0 + 35 * k, ph: rnd(k + 5) * TAU }
  })
  // how open a petal is: a spring from the touch; breathing once a bar
  // when open; and folded back to a bud as the letter is given back, the
  // inner petals first
  const openOf = (t, p) => {
    let o = spring((t - p.t0) / 1000)
    if (t > 21300) o *= 1 + 0.025 * Math.sin((TAU * (t - 21300)) / 2500 + 0.45 * p.k)
    const tc = CLOSE + 22 * (NP - 1 - p.k)
    if (t > tc) o = lerp(o, 0.1, spring((t - tc) / 1000, 1.25, 0.92))
    return o
  }
  // its heart: where the two touched, and, as the letter comes to be held,
  // behind it
  const centreAt = (t) => {
    const k = sineIO(u(t, S.swoosh[0] + 150, S.flip[1]))
    return [lerp(d.MEET[0], d.REST_AT[0], k), lerp(d.MEET[1], d.REST_AT[1], k)]
  }
  // full as it opens and turns; quieter while kai's is read; full again as
  // the letter is given back to it
  const gainAt = (t) => (t < 21700 ? 1 : t < S.give[0] ? lerp(1, 0.6, sineIO(u(t, 21700, 22400))) : lerp(0.6, 1, sineIO(u(t, S.give[0], S.give[0] + 350))))

  // each petal's swing, on a spring of its own, pushed by the letter going
  // past it and turned by its turning over; worked out once, a step at a
  // time from the touch
  const SW = 1000 / 120
  let SWAY = null
  const swayTable = () => {
    if (SWAY) return SWAY
    const n = Math.ceil((S.ifnot[0] - T0) / SW) + 2
    const tab = new Float32Array(n * NP)
    const st = new Float64Array(NP)
    const vel = new Float64Array(NP)
    const w = TAU * 0.7
    const z = 0.42
    let prev = null
    for (let i = 0; i < n; i++) {
      const tt = T0 + i * SW
      tab.set(st, i * NP)
      const force = new Float64Array(NP)
      if (tt >= S.swoosh[0] && tt <= S.flip[1] + 200) {
        const c = d.cardAt(tt)
        const cc = d.toPanel(d.panelView(tt), [c.x, c.y])
        if (prev) {
          const vx = (cc[0] - prev[0]) / SW
          const vy = (cc[1] - prev[1]) / SW
          const c0 = centreAt(tt)
          for (const p of MAIN) {
            const L = p.L * (0.08 + 0.92 * openOf(tt, p))
            const a = p.th + st[p.k]
            const mx = c0[0] + 0.55 * L * Math.cos(a)
            const my = c0[1] + 0.55 * L * Math.sin(a)
            const infl = Math.exp(-((Math.hypot(cc[0] - mx, cc[1] - my) / 300) ** 2))
            force[p.k] += ((0.0105 * infl * (vx * -Math.sin(a) + vy * Math.cos(a))) / Math.max(60, 0.55 * L)) * 1000
          }
        }
        prev = cc
      }
      const dflip = ((d.flipEase(u(tt, S.flip[0], S.flip[1])) - d.flipEase(u(tt - SW, S.flip[0], S.flip[1]))) * Math.PI * 1000) / SW
      for (let k = 0; k < NP; k++) {
        const acc = force[k] + 0.06 * dflip - 2 * z * w * vel[k] - w * w * st[k]
        vel[k] += (acc * SW) / 1000
        st[k] += (vel[k] * SW) / 1000
      }
    }
    SWAY = { tab, n }
    return SWAY
  }
  const swayAt = (t, k) => {
    const { tab, n } = swayTable()
    const f = (t - T0) / SW
    if (f <= 0) return 0
    const i = Math.min(Math.floor(f), n - 2)
    const a = Math.min(1, f - i)
    return tab[i * NP + k] * (1 - a) + tab[(i + 1) * NP + k] * a
  }
  const mainPetal = (t, p) => {
    const o = openOf(t, p)
    const oc = Math.min(1, o)
    const [x, y] = centreAt(t)
    return {
      x, y, th: p.th - 0.35 * (1 - oc) + swayAt(t, p.k), L: p.L * (0.08 + 0.92 * Math.max(0, o) ** 0.9),
      hw: p.W * (0.3 + 0.7 * Math.min(1.2, o)), bend: lerp(1.05, 0.12, oc), lean: p.lean, ruff: 0.035 * oc, ph: p.ph + t / 1400,
      a: smooth(0, 0.18, o) * (1 - (0.25 * p.k) / NP) * 0.55 * gainAt(t), front: 1, veil: smooth(0.1, 0.45, o),
      col: p.who ? AMBER_P : ICE_P, pointed: 0, o,
    }
  }

  // ── the envelopes, coming apart at the touch ──
  // every cell of the two, in quarters: leaving from the place they
  // touched outwards, with the touch's push, in streams, each to a petal
  // on its own side by where on the envelope it was (its top to the upper
  // petals), and out along that petal's rims as beads, one after another,
  // drawing them
  const LEAVING = (() => {
    const ps = []
    for (const [who, at] of [[0, d.TOUCHED.lin], [1, d.TOUCHED.kai]]) {
      d.ENV_ROWS.forEach((row, cy) => [...row].forEach((ch, cx) => {
        for (const [sx, sy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
          ps.push({ who, x: at[0] - 5.5 * C + (cx + sx) * C, y: at[1] - 3.5 * C + (cy + sy) * C, lit: ch === 'X' })
        }
      }))
    }
    const dmax = Math.max(...ps.map((p) => Math.hypot(p.x - d.MEET[0], p.y - d.MEET[1])))
    ps.forEach((p, n) => {
      p.t0 = S.touch[2] + 6 + 70 * (Math.hypot(p.x - d.MEET[0], p.y - d.MEET[1]) / dmax) + 10 * rnd(n + 3)
      p.dur = 560 + 180 * rnd(n + 11)
    })
    for (const who of [0, 1]) {
      const mine = ps.filter((p) => p.who === who)
      const pet = MAIN.filter((q) => q.who === who).sort((a, b) => Math.sin(a.th) - Math.sin(b.th))
      const ys = mine.map((p) => p.y).sort((a, b) => a - b)
      for (const p of mine) p.pet = pet[Math.min(pet.length - 1, Math.floor((ys.indexOf(p.y) / ys.length) * pet.length))].k
      for (const q of pet) {
        const group = mine.filter((p) => p.pet === q.k).sort((a, b) => a.t0 - b.t0)
        const half = Math.max(1, Math.floor((group.length - 1) / 2))
        group.forEach((p, n) => {
          p.side = n % 2 ? 1 : -1
          p.s = 0.16 + 0.82 * (Math.floor(n / 2) / half)
          p.t0 = group[0].t0 + n * 5
        })
      }
    }
    for (const p of ps) {
      const L = p.who ? AMBER : ICE
      p.col = p.lit ? L.lit : times(L.glow, 0.5)
    }
    return ps
  })()

  // ── kai's letter, given back ──
  // its face in blocks, each lifting whole in a sweep round the heart the
  // way the flower closes, to the nearest petal and in along its rim to
  // the heart; no holes eaten in it and no glowing edge
  const NU = 64
  const NV = 74
  let GIVING = null
  let FACE = null
  const giving = () => {
    if (GIVING) return GIVING
    const t0 = S.give[0]
    const c = d.cardAt(t0)
    const map = d.quadMap(d.cardQuad(c), d.PW, d.CARD_H)
    const v = d.panelView(t0)
    const hc = centreAt(t0)
    const bs = []
    for (let j = 0; j < NV; j++) {
      for (let i = 0; i < NU; i++) {
        // kai's is the letter's other side: its left is the front's right
        const fx = ((i + 0.5) / NU) * d.PW
        const fy = ((j + 0.5) / NV) * d.CARD_H
        const [sx, sy] = map(d.PW - fx, fy)
        const [x, y] = d.toPanel(v, [sx, sy])
        bs.push({ i, j, x, y, ang: Math.atan2(y - hc[1], x - hc[0]), rad: Math.hypot(x - hc[0], y - hc[1]) })
      }
    }
    const radMax = Math.max(...bs.map((b) => b.rad))
    const start = -Math.PI / 2 + 0.4
    bs.forEach((b, n) => {
      const sweep = (((start - b.ang) % TAU) + TAU) % TAU / TAU
      b.tb = t0 + 440 * (0.78 * sweep + 0.22 * rnd(n * 1.37 + 5)) + 40 * (1 - b.rad / radMax)
      b.dur = 300 + 100 * rnd(n * 2.71 + 9)
      let best = 0
      let bd = 9
      for (const p of MAIN) { const dd = Math.abs(wrap(b.ang - p.th)); if (dd < bd) { bd = dd; best = p.k } }
      b.pet = best
      b.side = wrap(b.ang - MAIN[best].th) >= 0 ? 1 : -1
      b.s0 = clamp(b.rad / MAIN[best].L, 0.2, 0.95)
    })
    GIVING = { bs, tb: new Float32Array(bs.map((b) => b.tb)) }
    return GIVING
  }
  const faceCol = (b) => {
    if (!FACE) return AMBER.lit
    const o = (b.j * NU + b.i) * 4
    return [FACE[o], FACE[o + 1], FACE[o + 2]].map((c) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 })
  }

  // ── the buds ──
  // a note's light folded round it as a bud is before it opens: wide petals
  // wrapped over each other, so it is round, its seams faint and its body
  // soft. It does not turn (a turning spiral is a thing loading); it
  // breathes, and sways a hair. `L` its reach, `bend` how far its petals
  // wrap, `a` its strength, `reach` petals stretching towards a point
  const bud = (out, { x, y, t, seed, L, col, a, bend = 1.4, reach = null, n = 5 }) => {
    if (a <= 0.002 || L <= 1) return
    for (let k = 0; k < n; k++) {
      const th = seed + k * GOLD + 0.05 * Math.sin(t / 1900 + seed * 3 + k)
      let Lk = L * (1 - 0.06 * k)
      let b = bend
      if (reach) {
        const dd = wrap(th + bend * 0.5 - reach.dir)
        const k2 = Math.max(0, Math.cos(dd)) ** 2 * reach.k
        Lk *= 1 + 0.9 * k2
        b = lerp(bend, 0.6, k2)
      }
      out.push({ x, y, th, L: Lk, hw: 0.55 * Lk, bend: b, lean: 0, ruff: 0, ph: 0, a, front: 0, veil: 4, col, pointed: 0 })
    }
  }
  const LB = 73
  // lin's: as its envelope goes away from the lens to its place, its light
  // trailing after it and, as it stops, wrapping round it, a little late,
  // into a bud
  const envWidth = (tt) => 11 * d.LENS.cell * (C / d.LENS.cell) ** expoOut(u(tt, S.away[0], S.away[1]))
  const linBud = (out, t) => {
    if (t < S.away[0] || t >= S.touch[2] + 200) return
    const [x, y] = d.linAt(t)
    const wide = envWidth(t - 140)
    const open = clamp((wide - 77) / 900)
    const b = d.breath(t)
    const fade = 1 - u(t, S.touch[2] - 20, S.touch[2] + 160)
    const reach = t >= S.lean[0] ? { dir: Math.atan2(d.kaiAt(t)[1] - y, d.kaiAt(t)[0] - x), k: sineIO(u(t, S.lean[0] + 300, S.touch[2] - 60)) } : null
    bud(out, {
      x, y, t, seed: 0.3, L: lerp(LB * (1 + 0.12 * b), 0.7 * wide, open), col: ICE_P,
      a: lerp(0.42, 0.5, open) * smooth(S.away[0] - 20, S.away[0] + 120, t) * fade, bend: lerp(1.4, 0.4, open), reach,
    })
  }
  // kai's: as it comes on, on the thursday, the same way, from nearer
  const kaiBud = (out, t) => {
    if (t < S.kaiIn + 60 || t >= S.touch[2] + 200) return
    const [x, y] = d.kaiAt(t)
    const k = expoOut(u(t, S.kaiIn + 60, S.kaiIn + 700))
    const b = 0.5 + 0.5 * Math.sin(((t - S.kaiIn) / 1900) * TAU)
    const fade = 1 - u(t, S.touch[2] - 20, S.touch[2] + 160)
    const reach = t >= S.lean[0] ? { dir: Math.atan2(d.linAt(t)[1] - y, d.linAt(t)[0] - x), k: sineIO(u(t, S.lean[0] + 300, S.touch[2] - 60)) } : null
    bud(out, { x, y, t, seed: 2.1, L: lerp(2.2 * LB, LB * (1 + 0.1 * b), k), col: AMBER_P, a: 0.42 * smooth(S.kaiIn + 60, S.kaiIn + 300, t) * fade, bend: lerp(0.6, 1.4, k), reach })
  }
  // the week's others: a small one each, shut, down at nine
  const othersBuds = (out, t) => {
    const down = 1 - u(t, S.lapse[1], S.lapse[1] + 350)
    if (down <= 0) return
    d.OTHERS.forEach((o, i) => {
      if (t < o.ms + 80) return
      const k = expoOut(u(t, o.ms + 80, o.ms + 560))
      bud(out, { x: o.at[0], y: o.at[1], t, seed: 1 + i * 0.7, L: lerp(1.8, 1, k) * LB * 0.6, col: petalCol(d.light(o.tint)), a: 0.26 * (o.a / 0.35) * smooth(o.ms + 80, o.ms + 300, t) * down, n: 4 })
    })
  }
  // the ones that never meet: a small bud each that never opens, and as
  // its screen goes out, folded into it, its light going in and not up
  const loneBuds = (out, t) => {
    d.LONE.forEach((l, i) => {
      if (t < l.in + 60 || t >= l.out + 320 * l.k) return
      const k = expoOut(u(t, l.in + 60, l.in + 520))
      const fold = u(t, l.out, l.out + 220 * l.k) ** 2
      const go = 1 - u(t, l.out + 100 * l.k, l.out + 260 * l.k)
      bud(out, { x: l.at[0], y: l.at[1], t, seed: 0.5 + i * 1.9, L: lerp(1.7, 1, k) * LB * 0.66 * (1 - 0.85 * fold), col: petalCol(d.light(l.tint)), a: 0.34 * smooth(l.in + 60, l.in + 280, t) * go, bend: 1.4 + 1.6 * fold, n: 4 })
    })
  }
  // under the question, one bud where the name's star will be, breathing
  // slowly; a little looser at `you?`; and for the name it opens a last
  // time, its four longest petals the star's four points
  const STAR_PTS = [[-Math.PI / 2, 101], [Math.PI / 2, 106], [Math.PI, 58], [0, 58]]
  const askBud = (out, hearts, t) => {
    if (t < S.ask[0]) return
    const { x, y } = d.STAR
    const k = expoOut(u(t, S.ask[0], S.ask[0] + 1200))
    const breath = 0.5 + 0.5 * Math.sin(((t - S.ask[0]) / 2500) * TAU - Math.PI / 2)
    const loose = 1 + 0.15 * sineIO(u(t, S.qWords[5], S.qWords[5] + 600))
    const opening = sineIO(u(t, S.lock[0] - 330, S.lock[0] + 50))
    const gone = 1 - u(t, S.lock[0] - 250, S.lock[0] + 50)
    if (gone > 0) {
      bud(out, { x, y, t, seed: 0.9, L: lerp(1.8, 1, k) * 70 * (1 + 0.08 * breath) * loose * (1 + 0.3 * opening), col: MUTUAL, a: 0.4 * smooth(S.ask[0], S.ask[0] + 500, t) * gone, bend: lerp(1.4, 0.5, opening) })
      // its heart, where nothing covers it
      hearts.push([x, y, 15 + 3 * breath, 0.13 * smooth(S.ask[0], S.ask[0] + 700, t) * gone, ...MUTUAL])
    }
    // the star's points
    const grow = expoOut(u(t, S.lock[0] - 300, S.lock[0] + 80))
    const fade = 1 - u(t, S.lock[0] + 100, S.lock[0] + 550)
    if (grow > 0 && fade > 0) {
      for (const [th, L] of STAR_PTS) out.push({ x, y, th, L: L * grow, hw: 0.11 * L, bend: 0, lean: 0, ruff: 0, ph: 0, a: 0.75 * fade, front: 1, veil: 1, col: WARM, pointed: 1 })
    }
    // and its light at the middle, staying
    if (t >= S.lock[0] - 300) hearts.push([x, y, 26, 0.12 * grow * (0.5 + 0.5 * fade) + 0.04, ...WARM])
  }

  // ── a frame ──
  let last = null
  const at = (t) => {
    if (last && last.t === t) return last
    const petals = []
    const hearts = []
    const pts = []
    const flying = []
    const remaining = []
    linBud(petals, t)
    kaiBud(petals, t)
    othersBuds(petals, t)
    // the flower, from the touch to the cut (its petals start a moment
    // after the touch, and the envelopes are drawn from it)
    let main = null
    let arrived = 0
    if (t >= S.touch[2] && t < S.ifnot[0]) {
      main = MAIN.map((p) => mainPetal(t, p))
      const front = new Float32Array(NP)
      for (const p of LEAVING) {
        if (t < p.t0) { remaining.push(p); continue }
        const k = (t - p.t0) / p.dur
        if (k >= 1) {
          front[p.pet] = Math.max(front[p.pet], p.s)
          const fade = 1 - u(t, p.t0 + p.dur, p.t0 + p.dur + 300)
          if (fade > 0) { const [x, y] = rimOf(main[p.pet], p.s, p.side); pts.push(x, y, ...times(p.col, 0.6 * fade)) }
          continue
        }
        const e = 1 - (1 - k) ** 2.4
        let x
        let y
        if (e < 0.12) {
          const [bx, by] = rimOf(main[p.pet], 0.16, p.side)
          const k2 = e / 0.12
          const dx = bx - p.x
          const dy = by - p.y
          const dist = Math.hypot(dx, dy) + 1e-6
          const cx = (p.x + bx) / 2 - (dy / dist) * dist * 0.35
          const cy = (p.y + by) / 2 + (dx / dist) * dist * 0.35
          x = (1 - k2) ** 2 * p.x + 2 * (1 - k2) * k2 * cx + k2 * k2 * bx
          y = (1 - k2) ** 2 * p.y + 2 * (1 - k2) * k2 * cy + k2 * k2 * by
        } else {
          const s = 0.16 + (p.s - 0.16) * ((e - 0.12) / 0.88)
          ;[x, y] = rimOf(main[p.pet], s, p.side)
          front[p.pet] = Math.max(front[p.pet], s)
        }
        pts.push(x, y, ...times(p.col, 0.2 + 0.7 * e))
        flying.push({ x, y, e, p })
      }
      main.forEach((m, k) => { m.front = t < T0 + 1600 ? front[k] : 1 })
      // the letter given back
      if (t >= S.give[0]) {
        const { bs } = giving()
        let n = 0
        for (const b of bs) {
          if (t < b.tb) continue
          const k = (t - b.tb) / b.dur
          if (k >= 1) { n++; continue }
          const E = sineIO(k)
          const p = main[b.pet]
          let x
          let y
          if (E < 0.25) {
            const [rx, ry] = rimOf(p, b.s0, b.side)
            x = lerp(b.x, rx, E / 0.25)
            y = lerp(b.y, ry, E / 0.25)
          } else {
            ;[x, y] = rimOf(p, b.s0 * (1 - (E - 0.25) / 0.75) + 0.02, b.side)
          }
          const col = faceCol(b)
          pts.push(x, y, ...times(col, (0.12 + 0.55 * E) * 1.1))
          flying.push({ x, y, e: E, b, col })
        }
        arrived = n / bs.length
      }
      for (const m of main) petals.push(m)
      // the heart: a glow, and florets on Vogel's spiral, as a flower's
      // and a galaxy's are
      const mo = main.reduce((s, m) => s + m.o, 0) / NP
      const [cx, cy] = centreAt(t)
      hearts.push([cx, cy, 40 + 30 * mo, 0.45 * mo * gainAt(t) + 0.55 * arrived, ...WARM])
      const nf = Math.floor(34 * clamp(mo * 1.2))
      for (let i = 1; i <= nf; i++) {
        const r = 7.5 * Math.sqrt(i) * (0.5 + 0.5 * mo)
        const a = i * GOLD + t / 4000
        pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a), ...times(WARM, 0.5 * (1 - i / 40) * gainAt(t)))
      }
    }
    if (t >= S.ifnot[0]) loneBuds(petals, t)
    askBud(petals, hearts, t)
    // the light out
    const n = Math.min(MAXP, petals.length)
    const buf = new Float32Array(MAXP * PETAL)
    for (let i = 0; i < n; i++) {
      const p = petals[i]
      buf.set([p.x, p.y, p.th, p.L, p.hw, p.bend, p.lean, p.ruff, p.ph, p.a, p.front, p.veil, p.col[0], p.col[1], p.col[2], p.pointed], i * PETAL)
    }
    const m = Math.min(MAXPTS, pts.length / 5)
    last = { t, light: { petals: buf, n, hearts: hearts.slice(0, 4), points: new Float32Array(pts), m }, main, remaining, flying, arrived }
    return last
  }

  return {
    // the ends of the flower's petals, and their colours, at `t`
    tipsAt: (t) => (t >= T0 && t < S.ifnot[0] ? MAIN.map((p) => { const m = mainPetal(t, p); return { x: m.x + m.L * 0.9 * Math.cos(m.th + m.bend * 0.9), y: m.y + m.L * 0.9 * Math.sin(m.th + m.bend * 0.9), col: m.col, a: m.a } }) : []),
    // the light placed on the panel at `t`
    lightAt: (t) => at(t).light,
    // the envelopes' cells still on them, and the pixels in flight
    leavingAt: (t) => { const f = at(t); return { remaining: t >= S.touch[2] + 6 ? f.remaining : null, flying: f.flying.filter((q) => q.p) } },
    // kai's letter as it is given back: which of its blocks are gone, the
    // ones in flight, and how much of it has gone
    givingAt: (t) => {
      if (t < S.give[0]) return null
      const f = at(t)
      return { gone: (i, j) => t >= giving().tb[j * NU + i], NU, NV, flying: f.flying.filter((q) => q.b), arrived: f.arrived }
    },
    // the flower's light at a point on the panel, for the letter's edges
    lightNear: (t, x, y) => { const f = at(t); return f.main ? lightAtPoint(f.main, f.light.hearts.slice(0, 1), x, y) : [0, 0, 0] },
    // kai's face, a block at a time (NU by NV, rgba), for the pixels' colours
    setFace: (data) => { FACE = data },
    centreAt,
    NU,
    NV,
  }
}

// ── the colours ─────────────────────────────────────────────────────────────
//
// What happens to the notes' light in the panel, as one idea: it spreads. A
// note's light goes out from it into the dark as ink goes out into water,
// quickly at first and then slower and slower, never stopping; inside it the
// light is drawn into silky streaks that flow outward and wind as they go,
// along spirals and never along spokes, and the dark is never quite still.
//
//   the night     lin's light goes out from the lens over the whole panel,
//                 and is left round the envelope as it waits, breathing
//   the week      every note that comes in spreads a little of its own
//                 colour round it; at nine they all go in, and are gone
//   the touch     the two lights go out together from where the envelopes
//                 touched, a bright front ahead of them, lin's ice on one
//                 side and kai's amber on the other, winding into each other;
//                 the envelopes' own pixels carried out on it
//   the letter    comes out of it, warped by it (reel-card.js); its turning
//                 over turns the colours with it, and a ring goes out from
//                 its edge; kai's letter melts back into it at the end, and
//                 its light goes out with the rest
//   the others    a little light round each, that goes in as it goes out:
//                 the mutual ones spread, the others shut
//   the question  a low light from the foot of the frame, rising, and a ring
//                 on `you?`; then all of it drawn in to one point, the mark's
//                 star, which keeps a little of it to the end
//
// Each spread is a source of colour the panel's shader draws (panel-fluid.js
// `SOURCE`): where it is, how far it has gone, how strong, its colour, how
// far its streaks have flowed and turned. Everything here is a function of
// the film's moment and nothing else.
import { S } from './reel-time.js'
import { MAXS, MAXPTS, SOURCE } from './panel-fluid.js'

const TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const u = (t, a, b) => clamp((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const smooth = (a, b, x) => { const k = u(x, a, b); return k * k * (3 - 2 * k) }
const sineIO = (k) => -(Math.cos(Math.PI * k) - 1) / 2
const rnd = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1
const mixed = (a, b, k) => a.map((x, i) => x * (1 - k) + b[i] * k)
const times = (rgb, k) => rgb.map((x) => x * k)

// how far a drop of ink has spread, `dt` seconds after it fell, of the
// way it will go: quickly at first, then slower and slower (`tau` its pace)
export const drop = (dt, tau) => (dt <= 0 ? 0 : (1 - Math.exp(-dt / tau)) ** 0.8)

// how far something going at `speed(t)` a second has gone from `t0` to `t`,
// a step at a time
const STEP = 1000 / 120
function gone(speed, t0, t) {
  if (t <= t0) return 0
  let s = 0
  for (let a = t0; a < t; a += STEP) {
    const b = Math.min(t, a + STEP)
    s += speed((a + b) / 2) * (b - a)
  }
  return s / 1000
}

// the light of a source at a point, as the panel's shader sums it, without
// its streaks (taken at their middle): for the letter's edges
function nearOf(s, x, y) {
  const dx = x - s.x
  const dy = y - s.y
  const r = Math.hypot(dx, dy) + 1e-4
  if (r > s.R * 1.3 || s.a <= 0) return 0
  const body = 1 - smooth(0.1 * s.R, s.R, r)
  const e = (r - 0.88 * s.R) / (0.16 * s.R + 4)
  const front = Math.exp(-e * e) * s.crest * 0.45
  let side = 1
  if (s.soft > 0) {
    const th = Math.atan2(dy, dx) + s.turn + 0.55 * Math.log(r + 36)
    const k = clamp((Math.cos(th - s.dir - 0.55 * 3.58) + s.soft) / (2 * s.soft))
    side = k * k * (3 - 2 * k)
  }
  return s.a * side * (s.body * body * 0.5 + front * 0.8)
}

// `d`: what the reel knows that the colours need. The letter's way
// (`cardAt`, `flipEase`), the camera on the panel (`panelView`, `toPanel`),
// where the notes are (`linAt`, `kaiAt`, `TOUCHED` where the two touched,
// `MEET`, `REST_AT` where the letter is held, `LENS`, `OTHERS`, `LONE`,
// `STAR`, `YOU` the question's last word), the envelope's cells
// (`ENV_ROWS`), the grid's cell `C`, `breath`, `EDGE` the moment the letter
// is on its edge, and `light(tint)`, a note's glow and its lit colour in
// linear light
export function makeAura(d) {
  const { C } = d
  const ICE = d.light('ice')
  const AMBER = d.light('amber')
  // a note's colour as it spreads: its glow, lifted a little towards its lit
  // colour; kai's amber lifted further, to a pale gold, as a strong orange
  // dimmed is brown
  const pale = (L, k = 0.2) => mixed(L.glow, L.lit, k)
  const ICE_P = pale(ICE, 0.18)
  const AMBER_P = times(pale(AMBER, 0.6), 1.08)
  const MUTUAL = mixed(ICE.lit, AMBER.lit, 0.5)
  const WARM = [1, 0.93, 0.86]
  const LILAC = pale(d.light('lilac'), 0)
  const ROSE = pale(d.light('rose'), 0)
  // the dark's own light: a deep blue from the foot, a violet from the top
  const SKY_A = mixed(ICE.glow, LILAC, 0.45)
  const SKY_B = mixed(LILAC, ROSE, 0.3)

  const T0 = S.touch[2]
  const CUT = S.ifnot[0]
  const zAt = (t) => d.panelView(t).z

  // ── the touch, and the letter ──
  // the spread's heart: where the two touched, and, as the letter comes to
  // be held, behind it
  const centreAt = (t) => {
    const k = sineIO(u(t, S.swoosh[0] + 150, S.flip[1]))
    return [lerp(d.MEET[0], d.REST_AT[0], k), lerp(d.MEET[1], d.REST_AT[1], k)]
  }
  // how far it has gone, as the frame sees it: the camera is drawn back from
  // the touch as it goes, and the spread is seen to go out evenly through
  // that; and further as kai's letter is given to it, and on past the cut
  const mainR = (t) => {
    const seen = 720 * drop((t - T0) / 1000, 0.5) + 420 * sineIO(u(t, S.give[0], CUT + 300)) + 520 * u(t, CUT, CUT + 1400) ** 0.7
    return seen / zAt(t)
  }
  const mainA = (t) => {
    const rise = smooth(T0, T0 + 140, t)
    const read = lerp(0.85, 0.42, sineIO(u(t, 21000, 22400)))
    const give = 0.3 * sineIO(u(t, S.give[0], S.give[0] + 600))
    // and at the cut most of the way down at once, as the scene cuts, the
    // rest of it going out after
    return rise * (read + give) * (t < CUT ? 1 : 0.45 * (1 - smooth(CUT, CUT + 800, t)))
  }
  const mainCrest = (t) => lerp(0.95, 0.25, smooth(T0, T0 + 1300, t)) + 0.35 * sineIO(u(t, S.give[0], S.give[0] + 700))
  const mainSpeed = (t) => lerp(1.1, 0.16, smooth(T0, T0 + 1500, t)) + 0.75 * smooth(S.give[0], S.give[0] + 500, t)
  // its streaks turn slowly, and with the letter as it turns over
  const mainTurn = (t) => 0.05 * Math.max(0, t - T0) / 1000 + 0.55 * d.flipEase(u(t, S.flip[0], S.flip[1])) + 0.25 * sineIO(u(t, S.give[0], CUT + 400))
  // the flow's phase is worked out for a frame once, then read back
  let flowMemo = { t: -1, v: 0 }
  const mainFlow = (t) => {
    if (flowMemo.t !== t) flowMemo = { t, v: gone(mainSpeed, T0, t) }
    return flowMemo.v
  }

  // ── the envelopes, carried out on it ──
  // every cell of the two, in quarters, leaving from where they touched
  // outwards, each carried out on the spread along its spirals, some to its
  // front and some only part of the way, fading as it goes
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
      const L = p.who ? AMBER : ICE
      p.r0 = Math.hypot(p.x - d.MEET[0], p.y - d.MEET[1])
      p.th0 = Math.atan2(p.y - d.MEET[1], p.x - d.MEET[0])
      p.t0 = T0 + 6 + 70 * (p.r0 / dmax) + 12 * rnd(n + 3)
      p.dur = 900 + 650 * rnd(n + 11)
      p.reach = 0.3 + 0.62 * rnd(n + 17) ** 0.6
      p.col = p.lit ? L.lit : times(L.glow, 0.5)
      p.turn0 = null
    })
    return ps
  })()
  const leaving = (t, pts, flying, remaining) => {
    if (t < T0 + 6 || t >= CUT) return
    const c = centreAt(t)
    const R = mainR(t)
    const turn = mainTurn(t)
    for (const p of LEAVING) {
      if (t < p.t0) { remaining.push(p); continue }
      const k = (t - p.t0) / p.dur
      if (k >= 1) continue
      if (p.turn0 == null) p.turn0 = mainTurn(p.t0)
      const e = 1 - (1 - k) ** 2.2
      const r = lerp(p.r0, Math.max(p.r0, p.reach * R), e)
      const th = p.th0 - (turn - p.turn0) - 0.55 * (Math.log(r + 36) - Math.log(p.r0 + 36))
      const x = c[0] + r * Math.cos(th)
      const y = c[1] + r * Math.sin(th)
      pts.push(x, y, ...times(p.col, 0.85 * (1 - k) ** 0.8))
      flying.push({ x, y, e: k, p })
    }
  }

  // ── a frame ──
  let last = null
  const at = (t) => {
    if (last && last.t === t) return last
    const out = []
    const hearts = []
    const pts = []
    const flying = []
    const remaining = []
    const add = (o) => { if (o.a > 0.002 && o.R > 1) out.push({ seed: 0, flow: 0, turn: 0, dir: 0, soft: 0, crest: 0, body: 1, time: 0, grain: 1, ...o }) }
    const night = (t - S.night[0]) / 1000

    // the dark's own light, from the lens on, faint and never still
    if (t >= S.night[0]) {
      const on = smooth(S.wash[1] - 100, S.away[1] + 400, t) * lerp(1, 0.55, u(t, S.lock[0], S.lock[1]))
      add({ x: 150, y: 1700, R: 1500, a: 0.13 * on, col: SKY_A, seed: 3.1, flow: 0.05 * night, turn: 0.012 * night, time: night, grain: 0.55 })
      add({ x: 980, y: 180, R: 1350, a: 0.1 * on, col: SKY_B, seed: 7.7, flow: 0.04 * night, turn: -0.01 * night, time: night, grain: 0.6 })
    }

    // the envelope's light, through the lens, out over the whole panel
    if (t >= S.wash[0] && t < S.lapse[0] + 200) {
      const dt = t - S.wash[0]
      const k = u(t, S.wash[0], S.lapse[0] + 100)
      add({
        x: d.L_AT[0], y: d.L_AT[1], R: 90 + 1050 * drop(dt / 1000, 0.7), a: 0.55 * (1 - k) ** 1.4 * smooth(S.wash[0], S.wash[0] + 60, t),
        col: ICE_P, seed: 1.7, flow: gone((v) => lerp(0.9, 0.15, u(v, S.wash[0], S.wash[0] + 1500)), S.wash[0], t), turn: 0.04 * dt / 1000,
        crest: 0.6 * (1 - k) ** 0.7, body: 0.8, time: dt / 1000,
      })
    }

    // lin's, waiting: a pool of its light round it, breathing; leaning to
    // kai's at nine, and gone into the touch
    if (t >= S.away[0] + 200 && t < T0 + 450) {
      const [x, y] = d.linAt(t)
      const lean = sineIO(u(t, S.lean[0] + 200, T0))
      const R = lerp(60, 290, 1 - (1 - u(t, S.away[0] + 200, S.away[0] + 1500)) ** 3) * (1 + 0.07 * (d.breath(t) - 0.5)) * (1 + 0.2 * lean)
      const [kx, ky] = d.kaiAt(t)
      add({
        x: lerp(x, kx, 0.18 * lean), y: lerp(y, ky, 0.18 * lean), R: R / lerp(1, zAt(t), 0.5 * lean),
        a: 0.42 * smooth(S.away[0] + 200, S.away[0] + 700, t) * (1 - smooth(T0 - 40, T0 + 420, t)),
        col: ICE_P, seed: 4.2, flow: 0.14 * night, turn: 0.05 * night, crest: 0.3, time: night,
      })
    }
    // kai's, on the thursday: its light coming on with it, the same way
    if (t >= S.kaiIn + 40 && t < T0 + 450) {
      const [x, y] = d.kaiAt(t)
      const lean = sineIO(u(t, S.lean[0] + 200, T0))
      const b = 0.5 + 0.5 * Math.sin(((t - S.kaiIn) / 1900) * TAU)
      const [lx, ly] = d.linAt(t)
      add({
        x: lerp(x, lx, 0.18 * lean), y: lerp(y, ly, 0.18 * lean),
        R: (215 * drop((t - S.kaiIn - 40) / 1000, 0.35) * (1 + 0.07 * (b - 0.5)) * (1 + 0.2 * lean)) / lerp(1, zAt(t), 0.5 * lean),
        a: 0.42 * smooth(S.kaiIn + 40, S.kaiIn + 200, t) * (1 - smooth(T0 - 40, T0 + 420, t)),
        col: AMBER_P, seed: 9.3, flow: gone((v) => lerp(0.7, 0.14, u(v, S.kaiIn, S.kaiIn + 1000)), S.kaiIn + 40, t), turn: 0.05 * night,
        crest: lerp(0.9, 0.3, smooth(S.kaiIn, S.kaiIn + 900, t)), time: night,
      })
    }
    // the week's others: a little of each one's colour, spreading round it,
    // faster as the week rushes; at nine they go in, one after another
    const rush = (v) => 1 + 2.2 * Math.sin(Math.PI * u(v, S.lapse[0], S.lapse[1])) ** 2
    d.OTHERS.forEach((o, i) => {
      if (t < o.ms + 60) return
      const end = S.lapse[1] + 70 * i
      if (t > end + 700) return
      const down = smooth(end, end + 600, t)
      add({
        x: o.at[0], y: o.at[1], R: 150 * (0.85 + 0.3 * rnd(i + 3)) * drop((t - o.ms - 60) / 1000, 0.3) * (1 - 0.92 * down),
        a: 0.36 * (o.a / 0.35) * smooth(o.ms + 60, o.ms + 220, t) * (1 - down ** 1.5),
        col: pale(d.light(o.tint), 0.15), seed: 11 + i * 1.3,
        flow: gone((v) => (v < end ? 0.15 * rush(v) : -1.1 * smooth(end, end + 200, v)), o.ms + 60, t), turn: 0.05 * night,
        crest: lerp(0.8, 0.25, u(t, o.ms, o.ms + 800)) + 0.5 * Math.sin(Math.PI * down), time: night,
      })
    })
    // as they near, the dark between the two lights up
    if (t >= S.lean[0] + 200 && t < T0 + 300) {
      const [lx, ly] = d.linAt(t)
      const [kx, ky] = d.kaiAt(t)
      const near = sineIO(u(t, S.lean[0] + 200, T0))
      add({ x: (lx + kx) / 2, y: (ly + ky) / 2, R: lerp(20, 75, near), a: 0.35 * near * (1 - smooth(T0, T0 + 300, t)), col: MUTUAL, seed: 5.5, flow: 0.3 * night, crest: 0.4, time: night })
    }

    // the touch: the two lights out together, lin's on its side and kai's
    // on its own, winding into each other
    if (t >= T0 && t < CUT + 1300) {
      const [x, y] = centreAt(t)
      const base = { x, y, R: mainR(t), a: mainA(t), flow: mainFlow(t), turn: mainTurn(t), soft: 0.5, crest: mainCrest(t), body: 0.9, time: (t - T0) / 1000 }
      add({ ...base, col: ICE_P, seed: 2.3, dir: Math.PI, wrap: true })
      add({ ...base, col: AMBER_P, seed: 2.3, dir: 0, wrap: true })
      // its heart: a flash of the two at once, and then a glow behind the
      // letter
      const z = zAt(t)
      const flash = lerp(1, 0.3, smooth(T0, T0 + 650, t)) * smooth(T0 - 10, T0 + 40, t) * (1 - smooth(CUT - 300, CUT + 200, t))
      hearts.push([x, y, (40 + 70 * drop((t - T0) / 1000, 0.3)) / z, 0.9 * flash, ...WARM])
    }
    // as the letter goes over its edge, a ring out from it
    if (t >= d.EDGE - 40 && t < d.EDGE + 1400) {
      const [x, y] = centreAt(d.EDGE)
      const k = u(t, d.EDGE - 40, d.EDGE + 1300)
      add({ x, y, R: 60 + 1000 * drop((t - d.EDGE + 40) / 1000, 0.5), a: 0.42 * (1 - k) ** 1.2 * smooth(d.EDGE - 40, d.EDGE + 40, t), col: MUTUAL, seed: 6.1, flow: 0.4 * (t - d.EDGE) / 1000, crest: 0.8, body: 0.25, time: (t - d.EDGE) / 1000, wrap: true })
    }
    // kai's letter given to it: its light going out from where it is, as it
    // melts (reel-card.js)
    if (t >= S.give[0] && t < CUT + 1000) {
      const c = d.cardAt(t)
      const [x, y] = d.toPanel(d.panelView(t), [c.x, c.y])
      const k = u(t, S.give[0], CUT)
      add({
        x, y, R: 220 + 650 * sineIO(k) + 300 * u(t, CUT, CUT + 1000), a: 0.5 * sineIO(u(t, S.give[0], S.give[0] + 500)) * (t < CUT ? 1 : 0.45 * (1 - smooth(CUT, CUT + 800, t))),
        col: AMBER_P, seed: 8.8, flow: gone((v) => lerp(0.4, 1.1, u(v, S.give[0], CUT)), S.give[0], t), turn: 0.2 * k, crest: 0.5, body: 0.85, time: (t - S.give[0]) / 1000, wrap: true,
      })
    }
    leaving(t, pts, flying, remaining)

    // ── the ones that never meet ──
    // a little light round each, and as its screen goes out, its light
    // going in, a last rim of it as it does
    d.LONE.forEach((l, i) => {
      if (t < l.in + 40) return
      const shut = smooth(l.out - 40, l.out + 320 * l.k, t)
      if (t > l.out + 420 * l.k) return
      add({
        x: l.at[0], y: l.at[1], R: 125 * drop((t - l.in - 40) / 1000, 0.25) * (1 - 0.95 * shut),
        a: 0.36 * smooth(l.in + 40, l.in + 180, t) * (1 - shut ** 2),
        col: pale(d.light(l.tint), 0.15), seed: 21 + i * 1.7,
        flow: gone((v) => (v < l.out ? 0.14 : -1.4), l.in + 40, t), turn: 0.05 * night,
        crest: lerp(0.7, 0.25, u(t, l.in, l.in + 600)) + 0.6 * Math.sin(Math.PI * shut), time: night,
      })
    })

    // ── the question ──
    // a low light from the foot of the frame, lin's on one side and kai's on
    // the other, rising; then all of it drawn in to the mark's star
    if (t >= S.ask[0] - 100 && t < S.lock[0] + 300) {
      const rise = sineIO(u(t, S.ask[0], S.ask[0] + 1800))
      const draw = sineIO(u(t, S.qOut - 750, S.lock[0] + 40))
      const gone2 = 1 - smooth(S.lock[0] - 60, S.lock[0] + 240, t)
      const speed = (v) => lerp(0.1, -1.7, sineIO(u(v, S.qOut - 750, S.lock[0] + 40)))
      const fl = gone(speed, S.ask[0] - 100, t)
      for (const [bx, by, col, seed, a0] of [[150, 1760, ICE_P, 31, 0.3], [930, 1800, AMBER_P, 33, 0.27]]) {
        add({
          x: lerp(bx, d.STAR.x, draw), y: lerp(by, d.STAR.y, draw), R: lerp(600, 1150, rise) * (1 - 0.95 * draw),
          a: a0 * rise * (1 + 1.3 * draw) * gone2, col, seed, flow: fl, turn: 0.03 * night, crest: 0.25 + 0.6 * draw, grain: 0.8, time: night,
        })
      }
    }
    // and a ring out from its last word
    const QY = S.qWords[5]
    if (t >= QY - 40 && t < QY + 1600) {
      const k = u(t, QY - 40, QY + 1500)
      add({ x: d.YOU[0], y: d.YOU[1], R: 40 + 1100 * drop((t - QY + 40) / 1000, 0.55), a: 0.38 * (1 - k) ** 1.3 * smooth(QY - 40, QY + 60, t), col: MUTUAL, seed: 41, flow: 0.4 * (t - QY) / 1000, crest: 0.7, body: 0.3, time: (t - QY) / 1000 })
    }

    // ── the name ──
    // the star keeps a little of the light, breathing, and as the address
    // is typed a last ring goes out from it
    if (t >= S.lock[0] - 220) {
      const grow = smooth(S.lock[0] - 220, S.lock[0] + 120, t)
      const breath = 0.5 + 0.5 * Math.sin(((t - S.lock[0]) / 2500) * TAU)
      const settle = lerp(0.6, 0.24, smooth(S.lock[0] + 120, S.lock[1] + 300, t))
      hearts.push([d.STAR.x, d.STAR.y, 26 + 6 * breath, grow * (settle + 0.05 * breath), ...WARM])
      add({ x: d.STAR.x, y: d.STAR.y, R: 150 * drop((t - S.lock[0] + 220) / 1000, 0.5), a: 0.16 * grow, col: MUTUAL, seed: 51, flow: 0.12 * night, turn: 0.03 * night, crest: 0.35, time: night })
      if (t >= S.url) {
        const k = u(t, S.url, S.url + 1700)
        add({ x: d.STAR.x, y: d.STAR.y, R: 30 + 900 * drop((t - S.url) / 1000, 0.6), a: 0.2 * (1 - k) ** 1.3 * smooth(S.url, S.url + 80, t), col: MUTUAL, seed: 53, flow: 0.3 * (t - S.url) / 1000, crest: 0.7, body: 0.2, time: (t - S.url) / 1000 })
      }
    }

    // ── the light out ──
    const n = Math.min(MAXS, out.length)
    const buf = new Float32Array(MAXS * SOURCE)
    for (let i = 0; i < n; i++) {
      const s = out[i]
      buf.set([s.x, s.y, s.R, s.a, s.col[0], s.col[1], s.col[2], s.seed, s.flow, s.turn, s.dir, s.soft, s.crest, s.body, s.time, s.grain], i * SOURCE)
    }
    const m = Math.min(MAXPTS, pts.length / 5)
    last = { t, light: { sources: buf, n, hearts: hearts.slice(0, 4), points: new Float32Array(pts), m }, out, hearts, flying, remaining }
    return last
  }

  return {
    // the light placed on the panel at `t`
    lightAt: (t) => at(t).light,
    // how many sources a frame holds, for a check that none is dropped
    countAt: (t) => at(t).out.length,
    // the envelopes' cells still on them, and the ones being carried out
    leavingAt: (t) => { const f = at(t); return { remaining: t >= T0 + 6 && t < CUT ? f.remaining : null, flying: f.flying } },
    // the spread's light at a point on the panel, for the letter's edges
    lightNear: (t, x, y) => {
      const f = at(t)
      const rgb = [0, 0, 0]
      for (const s of f.out) {
        if (!s.wrap) continue
        const k = nearOf(s, x, y)
        for (let i = 0; i < 3; i++) rgb[i] += k * s.col[i]
      }
      for (const h of f.hearts) {
        const k = Math.exp(-((x - h[0]) ** 2 + (y - h[1]) ** 2) / (h[2] * h[2])) * h[3]
        for (let i = 0; i < 3; i++) rgb[i] += k * h[4 + i]
      }
      return rgb
    },
    // the spread as the letter is warped by it: its heart, how far it has
    // gone, and how far its streaks have flowed and turned
    spreadAt: (t) => ({ c: centreAt(t), R: mainR(t), flow: t >= T0 ? mainFlow(t) : 0, turn: mainTurn(t) }),
    // where the notes' light is, for the panel's stars to drift from
    inkAt: (t) => at(t).out.filter((s) => s.R < 400 && s.body > 0.5).map((s) => ({ x: s.x, y: s.y, col: s.col, a: s.a })),
    centreAt,
  }
}

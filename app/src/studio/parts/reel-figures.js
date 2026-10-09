// ── the two of them ─────────────────────────────────────────────────────────
//
// What the light in the panel shows of the people the notes are between,
// drawn in the panel's own cells as everything after the send is:
//
//   the night     as lin's note waits, two sitting side by side on a wall
//                 by the sea, seen from behind, the note's light on the
//                 horizon in front of them: what the note is about. The
//                 envelope's light shows them as it spreads, and they fade
//                 as the week begins
//   the reveal    the same two, the light settling into the sea behind
//                 kai's letter as it is read, and as it melts they are
//                 there where it was, dark against all of its light
//   the others    two standing apart on a shore in the mist; one comes
//                 apart into scribbled lines that blow away, and the other
//                 stays
//   the question  the one left, standing, until the light is drawn in to
//                 the name's star
//
// The people are drawn here, by hand, as paths: no photograph is in them.
// Each frame is drawn into two pictures a cell a pixel (the panel's grid,
// panel-fluid.js): the light of the sky and the sea, and what blocks the
// light, the people and the wall, which are cut out of whatever light is
// behind them as a silhouette is. A function of the film's moment and
// nothing else.
import { S } from './reel-time.js'

const TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const u = (t, a, b) => clamp((t - a) / (b - a))
const smooth = (a, b, x) => { const k = u(x, a, b); return k * k * (3 - 2 * k) }
const rnd = (n) => ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1

// ── the people ──
// Each a path round its silhouette, in px, its middle at nought and its
// seat or its feet at nought, up the negative way: a head a little over a
// seventh of a standing height, shoulders, with the arms, a little under
// twice a head's height across.
// Sitting on the wall, seen from behind: long hair falling past the
// shoulders, so no neck shows, its head tipped a little towards the other,
// the arms down by the sides
const SIT_LONG = new Path2D(`
  M -77 0
  C -80 -20 -85 -62 -83 -96
  C -81 -126 -79 -150 -73 -162
  C -67 -172 -57 -177 -47 -181
  C -43 -183 -40 -187 -39 -194
  C -38 -214 -35 -238 -28 -254
  C -21 -268 -9 -275 5 -274
  C 19 -272 30 -263 35 -248
  C 40 -232 40 -212 40 -194
  C 41 -187 44 -183 48 -181
  C 58 -177 68 -172 74 -162
  C 80 -150 82 -126 84 -96
  C 86 -62 81 -20 78 0
  Z`)
// and beside it, a little taller and broader: short hair to the nape, a
// little of the neck under it, the shoulders square
const SIT_SHORT = new Path2D(`
  M -81 0
  C -84 -22 -88 -64 -86 -98
  C -84 -128 -81 -152 -75 -165
  C -67 -177 -51 -185 -35 -191
  C -25 -194 -20 -198 -19 -204
  C -19 -209 -23 -211 -31 -214
  C -39 -223 -41 -241 -37 -257
  C -32 -273 -18 -283 -1 -283
  C 16 -283 30 -273 35 -257
  C 39 -241 37 -223 29 -214
  C 21 -211 17 -209 17 -204
  C 18 -198 23 -194 33 -191
  C 49 -185 65 -177 73 -165
  C 79 -152 82 -128 84 -98
  C 86 -64 82 -22 79 0
  Z`)
// Standing in a long coat, seen side on, its face to the left and its head
// bowed: the face's line, the back of the head, the collar, the coat to
// below the knee, and the legs and feet under it
const STAND = new Path2D(`
  M -36 0
  C -31 -3 -16 -3 -11 -5
  L -13 -62
  C -21 -66 -30 -70 -40 -76
  C -46 -150 -50 -240 -50 -300
  C -50 -340 -46 -372 -40 -392
  C -36 -404 -33 -413 -31 -419
  C -35 -425 -40 -431 -45 -436
  C -50 -442 -53 -449 -54 -457
  C -57 -462 -60 -467 -59 -473
  C -57 -478 -55 -483 -54 -489
  C -51 -503 -39 -515 -23 -518
  C -6 -520 9 -512 15 -498
  C 20 -486 20 -470 15 -461
  C 12 -455 10 -450 10 -444
  C 16 -436 26 -428 32 -418
  C 40 -400 44 -360 42 -320
  C 40 -240 44 -150 46 -76
  C 38 -70 26 -66 18 -62
  L 15 -6
  C 19 -3 29 -2 32 0
  Z`)
// and the one who goes, facing it, its hair to the shoulders
const STAND_HAIR = new Path2D(`
  M -36 0
  C -31 -3 -16 -3 -11 -5
  L -13 -62
  C -21 -66 -30 -70 -40 -76
  C -46 -150 -50 -240 -50 -300
  C -50 -340 -46 -372 -40 -392
  C -36 -404 -33 -413 -31 -419
  C -35 -425 -40 -431 -45 -436
  C -50 -442 -53 -449 -54 -457
  C -57 -462 -60 -467 -59 -473
  C -57 -478 -55 -483 -54 -489
  C -51 -503 -39 -515 -23 -518
  C -4 -521 14 -512 21 -494
  C 27 -476 28 -452 30 -432
  C 33 -420 38 -410 40 -396
  C 44 -366 44 -340 42 -320
  C 40 -240 44 -150 46 -76
  C 38 -70 26 -66 18 -62
  L 15 -6
  C 19 -3 29 -2 32 0
  Z`)

// a person at `x`, `y` (its seat or its feet), `s` times its size, turned to
// face the other way with `flip`
const place = (g, path, x, y, s = 1, flip = false) => {
  g.save()
  g.translate(x, y)
  g.scale(flip ? -s : s, s)
  g.fill(path)
  g.restore()
}

// ── the scenes ──
// The sea: the horizon at `yh`, the wall the two sit on at `yw`; `moon` the
// light on the horizon they look at
const SEA = { yh: 1002, yw: 1530, moon: 540, pair: [[425, SIT_LONG, 1.3], [662, SIT_SHORT, 1.33]] }
// The shore: the mist's brightest at `yh`, the sand from there down, the
// two standing on it at `feet`
const SHORE = { yh: 1150, feet: 1505, a: 330, b: 720 }

// the sea's light: the sky's haze brightest at the horizon, the horizon a
// line of light, the light of the note on it and its path on the water, the
// water's glints flickering and drifting, darker towards the wall
function drawSea(g, t) {
  const { yh, yw, moon } = SEA
  g.globalCompositeOperation = 'lighter'
  let gr = g.createLinearGradient(0, yh - 760, 0, yh)
  gr.addColorStop(0, 'rgb(0,0,0)')
  gr.addColorStop(0.7, 'rgb(46,46,46)')
  gr.addColorStop(1, 'rgb(120,120,120)')
  g.fillStyle = gr
  g.fillRect(-60, yh - 760, 1200, 760)
  gr = g.createRadialGradient(moon, yh, 0, moon, yh, 420)
  gr.addColorStop(0, 'rgb(80,80,80)')
  gr.addColorStop(1, 'rgb(0,0,0)')
  g.fillStyle = gr
  g.fillRect(moon - 420, yh - 420, 840, 420)
  gr = g.createLinearGradient(0, yh, 0, yw)
  gr.addColorStop(0, 'rgb(84,84,84)')
  gr.addColorStop(0.35, 'rgb(46,46,46)')
  gr.addColorStop(1, 'rgb(16,16,16)')
  g.fillStyle = gr
  g.fillRect(-60, yh, 1200, yw - yh)
  // the horizon, brightest under the light
  gr = g.createLinearGradient(-60, 0, 1140, 0)
  gr.addColorStop(0, 'rgb(90,90,90)')
  gr.addColorStop(moon / 1200, 'rgb(220,220,220)')
  gr.addColorStop(1, 'rgb(90,90,90)')
  g.fillStyle = gr
  g.fillRect(-60, yh - 4, 1200, 7)
  // the glints: more of them, and shorter, nearer the horizon; more under
  // the light, its path on the water
  for (let i = 0; i < 340; i++) {
    const near = rnd(i * 3 + 1) ** 1.7
    const y = yh + 10 + (yw - yh - 30) * near
    const path = i % 3 === 0
    const x = path ? moon + (rnd(i * 5 + 2) - 0.5) * (60 + 260 * near) : -40 + 1160 * rnd(i * 5 + 2)
    const len = (8 + 34 * rnd(i * 7 + 3)) * (0.4 + near)
    const on = Math.sin(t / 1000 * (1.4 + 2.6 * rnd(i * 11 + 4)) + TAU * rnd(i * 13 + 5)) ** 2
    const v = Math.round((path ? 150 : 90) * (0.35 + 0.65 * on) * (1 - 0.55 * near))
    const drift = Math.sin(t / 1000 * 0.35 + TAU * rnd(i * 17 + 6)) * 10
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(x + drift - len / 2, y, len, 7)
  }
  g.globalCompositeOperation = 'source-over'
}

// the mist on a shore: the sky's haze, brightest along the horizon, banks
// of it drifting, and the wet sand under it holding a little of its light
function drawShore(g, t) {
  const { yh } = SHORE
  g.globalCompositeOperation = 'lighter'
  let gr = g.createLinearGradient(0, yh - 820, 0, yh)
  gr.addColorStop(0, 'rgb(0,0,0)')
  gr.addColorStop(0.6, 'rgb(40,40,40)')
  gr.addColorStop(1, 'rgb(150,150,150)')
  g.fillStyle = gr
  g.fillRect(-60, yh - 820, 1200, 820)
  gr = g.createLinearGradient(0, yh, 0, yh + 560)
  gr.addColorStop(0, 'rgb(118,118,118)')
  gr.addColorStop(0.25, 'rgb(64,64,64)')
  gr.addColorStop(1, 'rgb(10,10,10)')
  g.fillStyle = gr
  g.fillRect(-60, yh, 1200, 560)
  // banks of mist, drifting
  for (let i = 0; i < 4; i++) {
    const cx = 540 + Math.sin(t / 1000 * (0.11 + 0.05 * i) + i * 1.9) * 420
    const cy = yh - 60 - i * 70 + Math.sin(t / 1000 * 0.2 + i) * 14
    const rx = 420 + 120 * i
    g.save()
    g.translate(cx, cy)
    g.scale(1, 0.16)
    gr = g.createRadialGradient(0, 0, 0, 0, 0, rx)
    gr.addColorStop(0, 'rgb(34,34,34)')
    gr.addColorStop(1, 'rgb(0,0,0)')
    g.fillStyle = gr
    g.fillRect(-rx, -rx, 2 * rx, 2 * rx)
    g.restore()
  }
  // the wet sand's sheen, in streaks
  for (let i = 0; i < 90; i++) {
    const y = yh + 30 + 420 * rnd(i * 3 + 7) ** 1.4
    const x = -40 + 1160 * rnd(i * 5 + 8)
    const len = 30 + 120 * rnd(i * 7 + 9)
    const v = Math.round(36 * (0.5 + 0.5 * Math.sin(t / 1000 * (0.6 + rnd(i) * 0.8) + i)))
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(x - len / 2, y, len, 7)
  }
  g.globalCompositeOperation = 'source-over'
}

// The one who goes, as scribbles: strokes from its head and shoulders, as
// a pencil goes when a hand scribbles, its turning tight and then loose and
// then the other way, so its loops are never alike; and long hatching
// across them; all of it going to the left, the way the wind takes it,
// each in its own time
const SCRIBBLES = (() => {
  const out = []
  for (let i = 0; i < 64; i++) {
    const pts = []
    const hatch = i % 5 === 4
    let x = (rnd(i * 3 + 1) - 0.5) * 64
    let y = -505 + 330 * rnd(i * 5 + 2) ** 1.25
    let a = Math.PI + (rnd(i * 7 + 3) - 0.5) * (hatch ? 0.5 : 2.2)
    const sp0 = hatch ? 13 : 4.5 + 4 * rnd(i * 11 + 4)
    const n = hatch ? 22 + Math.floor(20 * rnd(i * 13 + 5)) : 60 + Math.floor(80 * rnd(i * 13 + 5))
    const f = [0.19 + 0.08 * rnd(i * 17 + 6), 0.071 + 0.03 * rnd(i * 19 + 7), 0.47 + 0.2 * rnd(i * 23 + 8)]
    for (let k = 0; k < n; k++) {
      pts.push([x, y])
      const curl = hatch
        ? 0.06 * Math.sin(k * 0.4 + i) + 0.04 * (Math.PI - a)
        : 0.5 * Math.sin(k * f[0] + i * 1.7) + 0.3 * Math.sin(k * f[1] + i * 3.1) + 0.18 * Math.sin(k * f[2] + i)
      a += curl
      const sp = sp0 * (0.65 + 0.7 * Math.abs(Math.sin(k * 0.13 + i)))
      x += Math.cos(a) * sp - (hatch ? 0 : 2.4)
      y += Math.sin(a) * sp * 0.75
    }
    out.push({ pts, t0: S.lone[0] - 60 + 700 * rnd(i * 29 + 9) ** 1.2, grow: 260 + 260 * rnd(i * 31 + 10), a: hatch ? 0.45 : 0.6 })
  }
  return out
})()
// a smooth noise over the panel's cells, for the one who goes to come apart
// in soft patches
const vnoise = (x, y) => {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const fx = x - i
  const fy = y - j
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const h = (a, b) => rnd(a * 57.3 + b * 131.7)
  return (h(i, j) * (1 - sx) + h(i + 1, j) * sx) * (1 - sy) + (h(i, j + 1) * (1 - sx) + h(i + 1, j + 1) * sx) * sy
}

// how much of each scene shows at `t`
const SCENES = {
  // the night: shown by the envelope's light as it spreads, gone as the
  // week begins
  sea1: (t) => (t < S.wash[1] || t > S.dLines[1] + 300 ? 0 : smooth(S.wash[1], S.away[1] + 200, t) * (1 - smooth(S.dLines[0] - 200, S.dLines[1] + 300, t))),
  // the reveal: settling in as kai's is read, there to the cut
  sea2: (t) => (t < S.flip[1] || t >= S.ifnot[0] ? 0 : smooth(S.flip[1], S.said, t)),
  // the others, and then the one left, until the light is drawn in
  shore: (t) => (t < S.ifnot[0] || t > S.lock[0] + 100 ? 0 : smooth(S.ifnot[0], S.ifnot[0] + 260, t) * (1 - smooth(S.qOut - 650, S.lock[0], t))),
}

// `PANEL`: the panel's grid (panel-fluid.js `cells`)
export function makeFigures(PANEL) {
  const lo = [PANEL.x - PANEL.margin * PANEL.c, PANEL.y - PANEL.margin * PANEL.c]
  // the one who goes, as a picture of its own to be taken apart a cell at
  // a time. It is read back every frame, so it is drawn on the processor
  // from the first: a canvas the browser moves there of its own accord after
  // a few readings draws a hair differently from then on, and a frame would
  // depend on how it was come to
  let goer = null
  const goerAt = () => {
    if (goer) return goer
    const c = document.createElement('canvas')
    c.width = PANEL.cw
    c.height = PANEL.ch
    c.getContext('2d', { willReadFrequently: true })
    goer = c
    return goer
  }
  const toCells = (g) => g.setTransform(1 / PANEL.c, 0, 0, 1 / PANEL.c, -lo[0] / PANEL.c, -lo[1] / PANEL.c)

  // the frame's two pictures, into `L` (the light) and `O` (what blocks it):
  // answers how much of it shows and its colour, or null
  function drawAt(t, L, O) {
    const k1 = SCENES.sea1(t)
    const k2 = SCENES.sea2(t)
    const k3 = SCENES.shore(t)
    const k = Math.max(k1, k2, k3)
    if (k <= 0.002) return null
    const gl = L.getContext('2d')
    const go = O.getContext('2d')
    for (const g of [gl, go]) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.globalCompositeOperation = 'source-over'
      g.globalAlpha = 1
      g.filter = 'none'
      g.fillStyle = '#000'
      g.fillRect(0, 0, PANEL.cw, PANEL.ch)
      toCells(g)
    }
    if (k1 > 0 || k2 > 0) {
      drawSea(gl, t)
      // the wall, and the two on it, blocking the light
      go.fillStyle = '#fff'
      go.fillRect(-60, SEA.yw, 1200, 1000)
      go.filter = 'blur(0.5px)'
      for (const [x, path, s] of SEA.pair) place(go, path, x, SEA.yw + 3, s)
      go.filter = 'none'
      return { k, tint: k1 > 0 ? 'night' : 'mutual' }
    }
    drawShore(gl, t)
    // the one who stays, and its reflection in the wet sand
    go.fillStyle = '#fff'
    go.filter = 'blur(0.5px)'
    place(go, STAND, SHORE.b, SHORE.feet, 1, false)
    go.globalAlpha = 0.22
    go.save()
    go.translate(0, 2 * SHORE.feet)
    go.scale(1, -0.55)
    place(go, STAND, SHORE.b, SHORE.feet, 1, false)
    go.restore()
    go.globalAlpha = 1
    // the one who goes: first blurred towards the wind, then taken apart a
    // cell at a time, its edge nearest the wind first, while its scribbles
    // blow away
    const gone = smooth(S.lone[0] + 350, S.lone[1] + 500, t)
    const smear = smooth(S.lone[0] - 100, S.lone[0] + 500, t)
    if (gone < 1) {
      const c = goerAt()
      const gg = c.getContext('2d')
      gg.setTransform(1, 0, 0, 1, 0, 0)
      gg.clearRect(0, 0, c.width, c.height)
      toCells(gg)
      gg.fillStyle = '#fff'
      gg.filter = 'blur(0.5px)'
      for (let j = 3; j >= 0; j--) {
        gg.globalAlpha = j ? 0.45 * smear * (1 - j / 4) : 1
        place(gg, STAND_HAIR, SHORE.a - j * 16 * smear, SHORE.feet, 0.97, true)
      }
      gg.globalAlpha = 0.22
      gg.save()
      gg.translate(0, 2 * SHORE.feet)
      gg.scale(1, -0.55)
      place(gg, STAND_HAIR, SHORE.a, SHORE.feet, 0.97, true)
      gg.restore()
      gg.globalAlpha = 1
      gg.filter = 'none'
      if (gone > 0) {
        const img = gg.getImageData(0, 0, c.width, c.height)
        const d = img.data
        const x0 = (SHORE.a - 120 - lo[0]) / PANEL.c
        for (let i = 0; i < d.length; i += 4) {
          if (!d[i + 3]) continue
          const px = (i / 4) % c.width
          const py = Math.floor(i / 4 / c.width)
          const n = 0.45 * vnoise(px / 2.6, py / 2.6) + 0.2 * rnd(px * 31.7 + py * 17.3) + 0.35 * clamp((px - x0) / 34)
          const keep = clamp((n - gone * 1.25 + 0.15) / 0.15)
          d[i + 3] = Math.round(d[i + 3] * keep)
        }
        gg.setTransform(1, 0, 0, 1, 0, 0)
        gg.putImageData(img, 0, 0)
      }
      go.setTransform(1, 0, 0, 1, 0, 0)
      go.drawImage(c, 0, 0)
      toCells(go)
    }
    // its scribbles, dark across the light, blown to the left as they go
    for (const sc of SCRIBBLES) {
      if (t < sc.t0) continue
      const age = t - sc.t0
      const fade = 1 - smooth(sc.t0 + 400, sc.t0 + 1200, t)
      if (fade <= 0) continue
      const n = Math.max(2, Math.floor(sc.pts.length * clamp(age / sc.grow)))
      const blow = 260 * (age / 1000) ** 1.3
      go.globalAlpha = sc.a * fade
      go.strokeStyle = '#fff'
      go.lineWidth = 6
      go.lineJoin = 'round'
      go.beginPath()
      for (let i = 0; i < n; i++) {
        const [x, y] = sc.pts[i]
        const X = SHORE.a + x - blow * (0.6 + 0.4 * (i / sc.pts.length))
        const Y = SHORE.feet + y - 0.02 * blow
        if (i) go.lineTo(X, Y)
        else go.moveTo(X, Y)
      }
      go.stroke()
    }
    go.globalAlpha = 1
    return { k: k3, tint: 'shore' }
  }

  return { drawAt, SEA, SHORE }
}

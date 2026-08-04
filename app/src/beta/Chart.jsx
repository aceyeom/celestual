// beta/Chart.jsx — THE CHART. The beta's sky.
//
// The production sky is a hundred and twenty thousand stars on a WebGL2 engine,
// every one of them coloured by its own blackbody temperature. It is a real
// galaxy and it is beautiful, and it is also the reason the old brand could
// never be quiet: a field that dense is always saying something, in blue and
// gold, behind text that is trying to say something else.
//
// This is the opposite decision, and it is the one the rebrand turns on.
//
//   ONE HUE. Ivory light on a brown ground. No temperature, no second accent,
//   nothing in the field that is a different colour from anything else in it.
//
//   A HUNDRED AND FIFTY STARS, not a hundred and twenty thousand. Emptiness is
//   the material. You cannot engrave anything into a surface that is already
//   full, and the pings are what this surface is for.
//
//   IT IS A CHART, NOT A PHOTOGRAPH. An engraved plate: a graticule tooled into
//   the case, a chalk band of dust across it, and every ping drawn the way an
//   astronomer marks an object they have actually found — a struck star, a
//   scribed ring, a leader out to a hand-set label. The ring is the design. A
//   dot with a glow around it is what every app in this category ships; a
//   circle scribed around a star, with the compass mark still visible, is
//   somebody having decided something.
//
// The star LOGIC is unchanged from production: your pings are stars, they are
// placed once and they stay put, a standing ping burns and a waiting one does
// not, and a mutual is a binary. What changed is entirely what it looks like.

import { useEffect, useRef } from 'react'
import { C, hexToRgb } from './tokens.js'
import { tooth } from './texture.js'

const IVORY = hexToRgb(C.ivory)
const WHEAT = hexToRgb(C.wheat)
const CARAMEL = hexToRgb(C.caramel)

const iv = (a) => `rgba(${IVORY[0]},${IVORY[1]},${IVORY[2]},${a})`
const wh = (a) => `rgba(${WHEAT[0]},${WHEAT[1]},${WHEAT[2]},${a})`
const cm = (a) => `rgba(${CARAMEL[0]},${CARAMEL[1]},${CARAMEL[2]},${a})`

// ── where a ping goes ────────────────────────────────────────────────────────
// Hand-placed, not random. Six anchors in normalized space, composed so that no
// two are close, none sits on the text column, and the set reads as a
// deliberate arrangement on a plate rather than as scatter. The wide set keeps
// clear of the left column the screens hang off; the narrow set moves the whole
// arrangement above the fold, where a phone has room.
//
// A ping keeps its anchor for as long as it exists, which is the point: your
// sky does not reshuffle itself behind your back.
const ANCHORS_WIDE = [
  { x: 0.775, y: 0.235 },
  { x: 0.905, y: 0.585 },
  { x: 0.665, y: 0.775 },
  { x: 0.845, y: 0.395 },
  { x: 0.575, y: 0.155 },
  { x: 0.735, y: 0.585 },
]

// ── the pocket edition ───────────────────────────────────────────────────────
// On a phone there is no margin to engrave into. The column is the whole width
// of the case, so a marked star with a leader and a hand-set label lands
// directly on top of the sentence somebody is reading, and no amount of nudging
// the anchors fixes that: the text moves, per screen, per length.
//
// So the narrow chart drops the marked pings entirely and keeps the field, the
// band and the graticule. This is what a plate does when it is printed small:
// the legend comes off first, because a legend you cannot read is worse than no
// legend. Nothing is lost, either, since the ledger names every ping in full
// two taps away; the sky on a phone is the case, not the chart.
const NARROW_AT = 760

// deterministic hash → the field never reshuffles between renders or reloads
function rnd(i, salt = 0) {
  let h = Math.imul(i + 1, 374761393) + Math.imul(salt + 1, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// ── the struck star ──────────────────────────────────────────────────────────
// Four tapered spikes off a point, the way a star is cut into a copper plate:
// the burin goes in at the centre and comes out at the tip, so the stroke is
// widest where it started. A bright one gets a second, smaller cross at
// forty-five degrees, which is how an engraver says "brighter" without drawing
// anything bigger.
function strike(ctx, x, y, r, a, colour = iv, bright = false) {
  const w = r * 0.17
  const arm = (rot, len) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.beginPath()
    ctx.moveTo(0, -len)
    ctx.quadraticCurveTo(w, -w, len, 0)
    ctx.quadraticCurveTo(w, w, 0, len)
    ctx.quadraticCurveTo(-w, w, -len, 0)
    ctx.quadraticCurveTo(-w, -w, 0, -len)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = colour(a)
  arm(0, r)
  if (bright) {
    ctx.fillStyle = colour(a * 0.5)
    arm(Math.PI / 4, r * 0.52)
  }
  // the point of the burin
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.5, r * 0.11), 0, Math.PI * 2)
  ctx.fillStyle = colour(Math.min(1, a * 1.25))
  ctx.fill()
}

// ── the scribed ring ─────────────────────────────────────────────────────────
// The compass mark around a found object. `progress` under 1 draws it partly,
// which is the send-off: you watch the ring being scribed around the star that
// just landed. `open` breaks the circle into a dashed one, which is what a
// ping to somebody who is not here yet looks like: marked, but not closed.
function scribe(ctx, x, y, r, a, { open = false, progress = 1, ticks = true } = {}) {
  ctx.save()
  ctx.strokeStyle = iv(a)
  ctx.lineWidth = 0.8
  if (open) ctx.setLineDash([2.4, 4.6])
  ctx.beginPath()
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, progress)))
  ctx.stroke()
  ctx.setLineDash([])
  if (ticks && progress > 0.94) {
    // the four cardinal marks, cut just outside the ring
    ctx.strokeStyle = iv(a * 0.75)
    ctx.lineWidth = 0.8
    for (let k = 0; k < 4; k++) {
      const ang = (k * Math.PI) / 2 - Math.PI / 2
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      ctx.beginPath()
      ctx.moveTo(x + c * (r + 1.6), y + s * (r + 1.6))
      ctx.lineTo(x + c * (r + 4.2), y + s * (r + 4.2))
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ── the leader and the label ─────────────────────────────────────────────────
// The callout an engraver runs from an object to its name: out at forty-five
// degrees, then flat, then the name sitting on the flat. Nothing here is a
// tooltip and nothing appears on hover. It is printed on the plate.
function label(ctx, x, y, r, text, tick, a, side) {
  const dir = side < 0 ? -1 : 1
  const d1 = 11
  const d2 = 30
  const sx = x + dir * (r + 2.5)
  const sy = y - 2.5
  const mx = sx + dir * d1
  const my = sy - d1
  const ex = mx + dir * d2
  ctx.save()
  ctx.strokeStyle = iv(a * 0.5)
  ctx.lineWidth = 0.75
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(mx, my)
  ctx.lineTo(ex, my)
  ctx.stroke()

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = dir < 0 ? 'right' : 'left'
  try {
    ctx.letterSpacing = '0.09em'
  } catch {
    /* older engines simply set it tighter */
  }
  ctx.font = "400 10.5px 'Courier Prime', 'Courier New', monospace"
  ctx.fillStyle = iv(a * 0.92)
  ctx.fillText(text, ex + dir * 5, my - 3.5)
  if (tick) {
    ctx.font = "400 9px 'Courier Prime', 'Courier New', monospace"
    ctx.fillStyle = iv(a * 0.42)
    ctx.fillText(tick, ex + dir * 5, my + 9)
  }
  try {
    ctx.letterSpacing = '0px'
  } catch {
    /* ignore */
  }
  ctx.restore()
}

export function Chart({ pings = [], dim = 1, mode = 'idle', origin, onSendoffDone, style }) {
  const hostRef = useRef(null)
  const cvRef = useRef(null)
  // everything the loop reads, held in a ref so a prop change never restarts it
  const stRef = useRef({
    pings: [],
    dim: 1,
    mode: 'idle',
    origin: null,
    onDone: null,
    // per-ping arrival clock: 0 → just placed, 1 → fully scribed
    born: new Map(),
    flight: null,
    t: 0,
    w: 0,
    h: 0,
    field: [],
    seed: 0,
  })

  // keep the loop's view of the world current
  const st = stRef.current
  st.pings = pings
  st.dim = dim
  st.mode = mode
  st.origin = origin
  st.onDone = onSendoffDone

  useEffect(() => {
    const host = hostRef.current
    const cv = cvRef.current
    if (!host || !cv) return
    const ctx = cv.getContext('2d', { alpha: true })
    if (!ctx) return
    const s = stRef.current
    const reduce =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

    let dpr = 1
    const size = () => {
      const r = host.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      s.w = Math.max(1, Math.round(r.width))
      s.h = Math.max(1, Math.round(r.height))
      cv.width = Math.round(s.w * dpr)
      cv.height = Math.round(s.h * dpr)
      cv.style.width = `${s.w}px`
      cv.style.height = `${s.h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildField()
    }

    // ── the field ─────────────────────────────────────────────────────────────
    // Sparse on purpose: one star per nine thousand square pixels, which on a
    // laptop is about a hundred and forty. Three depths, so a slow drift reads
    // as depth rather than as a texture sliding. Every star is ivory; the only
    // variation allowed is how much of it there is.
    function buildField() {
      const n = Math.round((s.w * s.h) / 9000)
      const out = []
      for (let i = 0; i < n; i++) {
        const depth = i % 3
        const mag = rnd(i, 1)
        out.push({
          x: rnd(i, 2),
          y: rnd(i, 3),
          depth,
          r: mag > 0.965 ? 1.9 + rnd(i, 4) * 0.7 : mag > 0.86 ? 1.15 : 0.62 + rnd(i, 5) * 0.28,
          a: mag > 0.965 ? 0.62 : mag > 0.86 ? 0.36 : 0.13 + rnd(i, 6) * 0.14,
          warm: rnd(i, 7) > 0.88,
          // only a handful breathe, on long desynced periods
          tw: rnd(i, 8) > 0.93 ? 7 + rnd(i, 9) * 9 : 0,
          ph: rnd(i, 10) * Math.PI * 2,
        })
      }
      s.field = out
    }

    size()
    const ro = new ResizeObserver(size)
    ro.observe(host)

    // ── the graticule ────────────────────────────────────────────────────────
    // Three great circles and one band, tooled into the case behind everything.
    // They turn about one degree every four seconds, which is under the
    // threshold at which motion competes with reading and above the one at
    // which a thing looks dead.
    function graticule(t, k) {
      const cx = s.w * 0.62
      const cy = s.h * 0.46
      const R = Math.max(s.w, s.h) * 0.62
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-0.34 + t * 0.0042)
      ctx.strokeStyle = iv(0.05 * k)
      ctx.lineWidth = 0.7
      for (let i = 0; i < 3; i++) {
        const squash = 0.16 + i * 0.29
        ctx.save()
        ctx.scale(1, squash)
        ctx.beginPath()
        ctx.arc(0, 0, R, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      // the meridian, straight through
      ctx.strokeStyle = iv(0.035 * k)
      ctx.beginPath()
      ctx.moveTo(0, -R * 0.72)
      ctx.lineTo(0, R * 0.72)
      ctx.stroke()
      ctx.restore()
    }

    // The band of dust. Chalk rubbed across the plate with a thumb: three soft
    // passes at slightly different angles, so the edge is never a clean
    // gradient stop.
    function band(k) {
      ctx.save()
      ctx.translate(s.w * 0.5, s.h * 0.5)
      ctx.rotate(-0.42)
      for (let i = 0; i < 3; i++) {
        const hgt = s.h * (0.30 + i * 0.16)
        const g = ctx.createLinearGradient(0, -hgt, 0, hgt)
        const a = (0.05 - i * 0.012) * k
        g.addColorStop(0, iv(0))
        g.addColorStop(0.5, iv(a))
        g.addColorStop(1, iv(0))
        ctx.fillStyle = g
        ctx.fillRect(-s.w, -hgt, s.w * 2, hgt * 2)
      }
      ctx.restore()
    }

    // ── your constellation ───────────────────────────────────────────────────
    // Two pings or more and the chart joins them. It is the smallest true thing
    // the sky can say about somebody: these are the people you are holding, and
    // they make a shape. Drawn as a slack hairline, the way a chart draws a
    // figure, and it stops at whichever stars have finished arriving.
    function constellation(pts, k) {
      if (pts.length < 2) return
      ctx.save()
      ctx.strokeStyle = iv(0.09 * k)
      ctx.lineWidth = 0.7
      ctx.beginPath()
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]
        const b = pts[i]
        // The figure runs between the RINGS, not between the stars: a chart
        // never draws a line through the object it has just marked.
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 1
        const gap = 19
        const ax = a.x + (dx / d) * gap
        const ay = a.y + (dy / d) * gap
        const bx = b.x - (dx / d) * gap
        const by = b.y - (dy / d) * gap
        const mx = (ax + bx) / 2
        const my = (ay + by) / 2 + d * 0.06
        ctx.moveTo(ax, ay)
        ctx.quadraticCurveTo(mx, my, bx, by)
      }
      ctx.stroke()
      ctx.restore()
    }

    let raf = 0
    let last = performance.now()

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!reduce) s.t += dt
      const t = s.t
      const k = Math.max(0, Math.min(1, s.dim))
      const narrow = s.w <= NARROW_AT

      ctx.clearRect(0, 0, s.w, s.h)

      band(k)
      graticule(t, k)

      // the field, drifting. Two pixels a minute on the far layer: you never
      // catch it moving, and it is never in the same place twice.
      for (const f of s.field) {
        const dep = 1 + f.depth * 0.9
        const x = ((f.x + t * 0.00055 * dep) % 1) * s.w
        const y = f.y * s.h + Math.sin(t * 0.06 + f.ph) * (1.2 * dep)
        let a = f.a * k
        if (f.tw) a *= 0.62 + 0.38 * Math.sin((t * Math.PI * 2) / f.tw + f.ph)
        if (f.r > 1.5) {
          strike(ctx, x, y, f.r * 2.4, a, f.warm ? wh : iv, true)
        } else {
          ctx.beginPath()
          ctx.arc(x, y, f.r, 0, Math.PI * 2)
          ctx.fillStyle = (f.warm ? wh : iv)(a)
          ctx.fill()
        }
      }

      // ── the pings ──────────────────────────────────────────────────────────
      const anchors = ANCHORS_WIDE
      const list = narrow ? [] : s.pings.slice(0, anchors.length)
      const pts = []
      for (let i = 0; i < list.length; i++) {
        const p = list[i]
        const A = anchors[i]
        const x = A.x * s.w + Math.sin(t * 0.05 + i * 1.7) * 1.6
        const y = A.y * s.h + Math.cos(t * 0.042 + i * 2.3) * 1.6
        pts.push({ x, y })
      }
      constellation(
        pts.filter((_, i) => (s.born.get(list[i].handle) ?? 1) > 0.6),
        k,
      )

      for (let i = 0; i < list.length; i++) {
        const p = list[i]
        const { x, y } = pts[i]
        // arrival clock: a star that has just been placed scribes its ring in
        let b = s.born.get(p.handle)
        if (b == null) {
          // a ping that was already here when the chart opened is already
          // scribed; one that has just been placed gets to arrive
          b = p.fresh ? 0 : 1
          s.born.set(p.handle, b)
        }
        if (b < 1) {
          b = Math.min(1, b + dt / 1.15)
          s.born.set(p.handle, b)
        }
        const mutual = p.state === 'mutual'
        const standing = p.state === 'standing' || mutual
        const R = mutual ? 15 : 12.5
        const lit = standing ? 1 : 0.52
        const breathe = standing ? 0.86 + 0.14 * Math.sin(t * 1.05 + i) : 1

        if (mutual) {
          // a binary: two stars in one ring, joined. The product's whole
          // mechanism, drawn once, with no word next to it.
          const sep = 5.4
          const ang = t * 0.09 + i
          const ax = x + Math.cos(ang) * sep
          const ay = y + Math.sin(ang) * sep * 0.55
          const bx = x - Math.cos(ang) * sep
          const by = y - Math.sin(ang) * sep * 0.55
          ctx.save()
          ctx.strokeStyle = cm(0.34 * k)
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
          ctx.stroke()
          ctx.restore()
          strike(ctx, ax, ay, 7.5, 0.95 * k * breathe, cm, true)
          strike(ctx, bx, by, 6.6, 0.8 * k * breathe, iv, true)
          scribe(ctx, x, y, R, 0.3 * k, { progress: b })
          scribe(ctx, x, y, R + 3.2, 0.14 * k, { progress: b, ticks: false })
        } else {
          strike(ctx, x, y, 8.5, lit * k * breathe, standing ? cm : iv, standing)
          scribe(ctx, x, y, R, (standing ? 0.28 : 0.17) * k, { open: !standing, progress: b })
        }

        if (b > 0.72) {
          const side = A_side(anchors[i], narrow)
          const la = (b - 0.72) / 0.28
          label(
            ctx,
            x,
            y,
            R,
            `@${p.handle}`,
            p.tick || '',
            (mutual ? 0.95 : standing ? 0.72 : 0.5) * k * la,
            side,
          )
        }
      }

      // ── the send-off ─────────────────────────────────────────────────────────
      // The @ becomes a star: a spark rises off the field, arcs to the anchor
      // that is waiting for it, and lands. Then the compass comes round and
      // scribes the ring, which is the moment the ping exists. One gesture,
      // three seconds, and it ends by handing the screen back.
      if (s.mode === 'sendoff' && !s.flight) {
        // narrow keeps no marked pings, so the star flies out to the top of the
        // case and is gone, which is the same gesture with the destination off
        // the plate instead of on it
        const idx = Math.min(narrow ? 0 : list.length, anchors.length - 1)
        const A = narrow ? { x: 0.82, y: 0.09 } : anchors[idx]
        s.flight = {
          t: 0,
          from: s.origin || { x: 0.5, y: 0.62 },
          to: A,
          fired: false,
        }
      }
      if (s.mode !== 'sendoff' && s.flight) s.flight = null
      if (s.flight) {
        const F = s.flight
        F.t += dt
        const T = Math.min(1, F.t / 2.05)
        const e = 1 - Math.pow(1 - T, 2.6)
        const x0 = F.from.x * s.w
        const y0 = F.from.y * s.h
        const x1 = F.to.x * s.w
        const y1 = F.to.y * s.h
        // one arc, up and over: the star goes out into the field, not across it
        const cx = (x0 + x1) / 2 + (y1 - y0) * 0.18
        const cy = Math.min(y0, y1) - Math.abs(x1 - x0) * 0.24 - 40
        const px = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * x1
        const py = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * y1
        // the thread it leaves behind, fading from the tail
        ctx.save()
        ctx.strokeStyle = cm(0.2 * (1 - T * 0.6) * k)
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.quadraticCurveTo(cx * e + x0 * (1 - e), cy * e + y0 * (1 - e), px, py)
        ctx.stroke()
        ctx.restore()
        strike(ctx, px, py, 7 + 5 * (1 - T), 0.95 * k, cm, true)
        if (T >= 1) {
          if (!narrow) scribe(ctx, x1, y1, 12.5, 0.3 * k, { progress: Math.min(1, (F.t - 2.05) / 0.7) })
          if (F.t > 3 && !F.fired) {
            F.fired = true
            if (s.onDone) s.onDone()
          }
        }
      }
    }

    // Which side of a star its label hangs off: outward from the middle of the
    // plate, so a callout never runs off the edge and never crosses the column.
    function A_side(A, narrow) {
      if (narrow) return A.x > 0.55 ? -1 : 1
      return A.x > 0.82 ? -1 : 1
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        // the case the chart is engraved into: one warm rise off the upper
        // left, everything else falling away to the closed-book brown, and a
        // real tooth over all of it so the gradient never bands
        backgroundColor: C.void,
        backgroundImage: [
          `radial-gradient(120% 92% at 18% -8%, ${C.cocoa} 0%, rgba(46,30,20,0) 62%)`,
          `radial-gradient(80% 70% at 92% 108%, rgba(107,69,38,0.30) 0%, rgba(107,69,38,0) 60%)`,
          `radial-gradient(150% 120% at 50% 50%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.52) 100%)`,
          tooth(),
        ].join(', '),
        backgroundSize: 'auto, auto, auto, 128px 128px',
        ...style,
      }}
    >
      <canvas ref={cvRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

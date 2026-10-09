// ── round, played ──────────────────────────────────────────────────────────
// The animatic: every frame of the film drawn from its clock (round-time.js)
// and nothing else. Each frame, the worlds it shows are lit and dithered
// into panels (round-worlds.js through round-gl.js) with their people posed
// at that moment (round-cast.js); the writer's phone and the wall's letters
// are drawn as the product draws them (round-screen.js); one full size pass
// lays the halves, the pane, the phone and the end card together; the clock
// on the hinge is drawn over it. `frame(f)` draws any frame, in any order.

import * as T from './round-time.js'
import { createRenderer, sheetCrop } from './round-gl.js'
import { PALETTES } from './round-product.js'
import { blueBytes } from './round-blue.js'
import { drawCast, MASK_W, MASK_H, PHONE } from './round-cast.js'
import { drawPhone, drawLetterCard, drawLockup, FACE, LOCKUP_SIZE } from './round-screen.js'

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const span = (x, a, b) => clamp((x - a) / (b - a))
const sm = (k) => { const x = clamp(k); return x * x * (3 - 2 * x) }
// the phone, drawn at twice its size on the frame
const PS = 2

// The end card's modules, two across in whole cells, inside the platforms'
// safe zones (the top 269 px, 65 px a side, the bottom 340 of an organic
// post): four for the final, six for the long version
export function layoutFor(n) {
  if (n <= 4) {
    const slots = [[78, 336, 444, 474], [558, 336, 444, 474], [78, 846, 444, 474], [558, 846, 444, 474]]
    return { slots: slots.slice(0, n), lineY: 264, lockY: 1356 }
  }
  return { slots: Array.from({ length: n }, (_, k) => [138 + (k % 2) * 420, 318 + Math.floor(k / 2) * 372, 384, 342]), lineY: 252, lockY: 1440 }
}

export function createRound(canvas, overlay) {
  const layout = layoutFor(T.N)
  const R = createRenderer(canvas, { blue: blueBytes(), palettes: PALETTES, layout })
  const og = overlay.getContext('2d')

  // ── the people, a mask a panel, made again only when they have moved ──
  const mask = document.createElement('canvas')
  mask.width = MASK_W
  mask.height = MASK_H
  const mg = mask.getContext('2d')
  const held = new Array(10).fill('')
  function maskFor(slot, w) {
    const c = w.clock - (((w.clock % 2) + 2) % 2)
    const key = `${w.world}:${c}:${(w.look || 0).toFixed(3)}`
    if (held[slot] === key) return
    held[slot] = key
    drawCast(mg, w.world, w.clock, w.look || 0)
    R.setMask(slot, mask)
  }

  // ── a world's own facts at a moment: the walk signal, the sun, the lamps ──
  function factsOf(w) {
    const k = w.world
    const i = T.linkOfWorld(k)
    const o = { sent: -1 }
    if (i >= 0) {
      const L = T.LINKS[i]
      const P = T.PLAN[i]
      const x = w.clock + T.WORLDS[k].origin - L.start
      o.sent = x >= P.send ? x - P.send : -1
      if (k === 5) o.sun = sm(span(x, P.flood - 4, P.flood + 44))
    }
    if (k === 2) o.lampsOff = T.LAMPS_OFF
    return o
  }
  function world(panel, slot, w, extra = {}) {
    maskFor(slot, w)
    R.drawWorld(panel, slot, { world: w.world, clock: w.clock, flood: w.flood || 0, palette: w.palette || 'night', look: w.look || 0, ...factsOf(w), ...extra })
  }
  function sheets(f) {
    // each lit by its writer's phone, held up as it was when the letter went up
    T.sheetAt(f).forEach((w, k) => world(R.sheets[k], 4 + k, w, { phoneRect: PHONE[w.world], phoneLit: 1 }))
  }

  // ── the phone ──
  const pcv = document.createElement('canvas')
  let pKey = ''
  function phoneOn(k, p, f) {
    const r = PHONE[k]
    const pw = r[2] - r[0]
    const ph = r[3] - r[1]
    if (pcv.width !== pw * PS || pcv.height !== ph * PS) { pcv.width = pw * PS; pcv.height = ph * PS; pKey = '' }
    // what it shows changes only with these
    const beat = ((f - Math.max(p.since, p.greetSince)) % 32 + 32) % 32
    const key = [k, p.mode, p.greet, p.text, p.count, p.pressed, beat < 16, Math.min(3, f - p.since), p.lit.toFixed(2), p.editing, f - p.keyAt < 3].join('|')
    if (key !== pKey) {
      pKey = key
      const g = pcv.getContext('2d')
      drawPhone(g, pcv.width, pcv.height, p, f)
      if (p.lit < 1) {
        // waking: the panel comes up under its veil
        g.globalCompositeOperation = 'source-atop'
        g.fillStyle = `rgba(0, 0, 0, ${1 - p.lit})`
        g.fillRect(0, 0, pcv.width, pcv.height)
        g.globalCompositeOperation = 'source-over'
      }
      R.setPhone(pcv)
    }
    // risen from below the frame
    const off = (1 - p.rise) * (960 - r[1] + 40)
    return { half: [r[0], r[1] + off, r[2], r[3] + off], frame: [r[0], 960 + r[1] + off, r[2], 960 + r[3] + off] }
  }

  // ── the wall's letters, the line and the lockup, one atlas ──
  function cards() {
    const [, , sw, sh] = layout.slots[0]
    // the contact sheet's scale: module px a frame px
    const crop = sheetCrop(sw, sh)
    const s = sw / crop[2]
    const phW = Math.round(400 * s)
    const phH = Math.round(776 * s)
    const cv = document.createElement('canvas')
    cv.width = sw * 3
    cv.height = sh * 2 + 80 + 200 + 8 + phH
    const g = cv.getContext('2d')
    const rects = []
    T.LINKS.forEach((L, i) => {
      const x = (i % 3) * sw
      const y = Math.floor(i / 3) * sh
      drawLetterCard(g, x, y, sw, sh, { colour: L.colour, bat: L.bat, stamp: L.stamp, greet: L.greet, text: T.typed[i].full })
      rects.push([x, y, sw, sh])
    })
    // (the line and the lockup are always the atlas's seventh and eighth)
    while (rects.length < 6) rects.push([0, 0, 0, 0])
    const y0 = sh * 2
    // the line, at the size the platforms' captions are read at
    const line = 'every letter on the wall is to somebody.'
    g.font = `400 60px ${FACE}`
    const lw = Math.ceil(g.measureText(line).width) + 8
    g.fillStyle = '#0A0A0A'
    g.fillRect(0, y0, lw, 72)
    g.fillStyle = '#F4F1EA'
    g.textBaseline = 'middle'
    g.textAlign = 'left'
    g.fillText(line, 4, y0 + 38)
    rects.push([0, y0, lw, 72])
    // the lockup at three pixels a cell, the address under it
    const [lkw, lkh] = LOCKUP_SIZE
    const cw = 400
    const ly = y0 + 80
    g.fillStyle = '#0A0A0A'
    g.fillRect(0, ly, cw, 200)
    drawLockup(g, (cw - lkw * 3) / 2, ly, 3)
    g.fillStyle = '#F4F1EA'
    g.font = `400 44px ${FACE}`
    g.textAlign = 'center'
    g.fillText('celestual.us', cw / 2, ly + lkh * 3 + 54)
    rects.push([0, ly, cw, 200])
    // the writers' phones for the contact sheet, each as it was held up on
    // its link's last frame, and where each sits in its module
    const py = ly + 208
    const phones = []
    T.LINKS.forEach((L, i) => {
      const r = PHONE[L.world]
      const pc = document.createElement('canvas')
      pc.width = phW
      pc.height = phH
      const end = L.start + L.bars * T.BAR - 1
      drawPhone(pc.getContext('2d'), phW, phH, T.phoneAt(i, end), end)
      g.drawImage(pc, i * (phW + 4), py)
      rects[8 + i] = [i * (phW + 4), py, phW, phH]
      phones.push(Math.round((r[0] - crop[0]) * s), Math.round((r[1] - crop[1]) * s), phW, phH)
    })
    for (let k = 0; k < 12; k++) if (!rects[k]) rects[k] = [0, 0, 0, 0]
    R.setCards(cv, rects, phones)
  }
  cards()

  // ── the clock on the hinge: the product's plates, chalk on dark ──
  function plate(x, w, cur, prev, fold) {
    const h = 84
    const y = 960 - h / 2
    const half = h / 2
    const text = (s, clipTop) => {
      og.save()
      og.beginPath()
      og.rect(x, clipTop ? y : y + half, w, half)
      og.clip()
      og.fillStyle = '#F4F1EA'
      og.font = `400 66px ${FACE}`
      og.textAlign = 'center'
      og.textBaseline = 'middle'
      og.fillText(s, x + w / 2, y + half + 3)
      og.restore()
    }
    const half_ = (top, s, k = 1, dark = 0) => {
      // a half folded toward the seam by k (1 flat, 0 edge on)
      og.save()
      og.translate(0, 960)
      og.scale(1, Math.max(0.001, k))
      og.translate(0, -960)
      og.fillStyle = top ? '#1E1D22' : '#151418'
      og.beginPath()
      if (top) { og.roundRect(x, y, w, half, [10, 10, 0, 0]) } else { og.roundRect(x, y + half, w, half, [0, 0, 10, 10]) }
      og.fill()
      text(s, top)
      if (dark > 0) { og.fillStyle = `rgba(0, 0, 0, ${dark})`; og.fill() }
      og.restore()
    }
    const turning = prev != null && fold < 8 / 9
    // under the moving halves: the new top, the old bottom
    half_(true, cur)
    half_(false, turning ? prev : cur)
    if (turning) {
      const a = fold * (9 / 4) // the old top folds down, then the new bottom
      if (a < 1) half_(true, prev, Math.cos((a * Math.PI) / 2), 0.4 * a)
      else half_(false, cur, Math.sin(((a - 1) * Math.PI) / 2), 0.3 * (2 - a))
    }
    og.fillStyle = '#08070B'
    og.fillRect(x, 959, w, 2)
  }
  function clock(c) {
    og.clearRect(0, 0, overlay.width, overlay.height)
    if (!c.show) return
    og.save()
    let x = 72
    plate(x, 84, String(c.hour), c.prev ? String(c.prev.hour) : null, c.fold)
    x += 84 + 6
    og.fillStyle = '#F4F1EA'
    og.fillRect(x + 4, 944, 8, 8)
    og.fillRect(x + 4, 968, 8, 8)
    x += 20
    // the minutes turn only when the plates arrive from blank
    const was = c.fresh ? '' : null
    plate(x, 58, '1', was, c.fold)
    x += 64
    plate(x, 58, '4', was, c.fold)
    x += 58 + 10
    plate(x, 84, c.merid, c.prev && c.prev.merid !== c.merid ? c.prev.merid : null, c.fold)
    og.restore()
  }

  // ── one frame ──
  function frame(input) {
    const f = T.wrap(Math.round(input))
    const fr = T.frameAt(f)
    const c = { f, flips: [0, 0, 0, 0, 0, 0], top: 1, bot: 0 }
    // the pane at this frame's angle, crisp: no shutter, no blur
    const shutter = (fl) => { c.th = T.angleOf(fl, f) }
    if (fr.phase === 'end') {
      sheets(f)
      c.end = true
      c.flips = fr.cascade.map((m) => m.theta)
      c.line = fr.line
      c.lockup = fr.lockup
      if (fr.settle) {
        world(R.halves[3], 3, fr.settle.under)
        Object.assign(c, { pane: true, top: 4, bot: 3, front: 4, back: 4, th: fr.settle.theta })
      } else if (fr.flap) {
        world(R.halves[0], 0, fr.flap.back)
        world(R.halves[1], 1, fr.flap.revealed)
        Object.assign(c, { pane: true, top: 1, bot: 4, front: 4, back: 0 })
        shutter(fr.flap)
      }
    } else {
      // the one writing, and the one above
      const p = fr.phone && fr.phone.rise > 0 ? fr.phone : null
      const k = fr.bottom.world
      const at = p ? phoneOn(k, p, f) : null
      world(R.halves[0], 0, fr.bottom, at ? { phoneRect: at.half, phoneLit: p.lit } : {})
      world(R.halves[1], 1, fr.top)
      if (at) c.phone = at.frame
      if (fr.flap && fr.flap.kind === 'pane') {
        world(R.halves[2], 2, fr.flap.revealed)
        Object.assign(c, { pane: true, top: 2, bot: 0, front: 1, back: 1 })
        shutter(fr.flap)
      } else if (fr.flap) {
        // the last card, onto the contact sheet
        sheets(f)
        Object.assign(c, { pane: true, top: 4, bot: 0, front: 1, back: 4 })
        shutter(fr.flap)
      } else if (fr.settle) {
        world(R.halves[3], 3, fr.settle.under)
        Object.assign(c, { pane: true, top: 1, bot: 3, front: 0, back: 0, th: fr.settle.theta })
        c.phone = null
      }
      // the seam's pulse, as a flap lands and as a greeting comes up
      if (fr.link) {
        const i = fr.link - 1
        const x = f - T.LINKS[i].start
        const pulse = (d) => (d >= 0 && d < 14 ? Math.exp(-d / 3.5) : 0)
        c.ripple = Math.max(i > 0 ? pulse(x) : 0, pulse(x - T.PLAN[i].greet))
      }
    }
    R.composite(c)
    clock(T.clockAt(f))
    return fr
  }

  return { frame, renderer: R }
}

// ── round, as posters ──────────────────────────────────────────────────────
// Posters for Instagram, 1080 by 1350 (4:5), drawn from the film's own parts:
// its frames (round-page.js), its letters as the product draws them
// (round-screen.js), its clock's plates, the lockup. One module of 90 (fifteen
// of the film's 6 px cells) makes a 12 by 15 grid with a module's margin all
// round; every edge sits on the cell grid, so the pictures stay whole cells
// at every size Instagram shows them. Type: Newsreader for the line, Jersey
// only on lit things, Geist Mono for the address. Each poster is a function
// that fills a 1080 by 1350 element at the device's pixel ratio.

import * as T from './round-time.js'
import { createRound } from './round-page.js'
import { drawScreen, drawLockup, FACE, LOCKUP_SIZE } from './round-screen.js'

export const M = 90
const PW = 1080
const PH = 1350
const CHALK = '#F4F1EA'
const ASH = '#9C978E'
const GROUND = '#0A0A0A'

// ── the pieces ──
function el(parent, tag, cls, css, html) {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (css) e.style.cssText = css
  if (html != null) e.innerHTML = html
  parent.appendChild(e)
  return e
}
// a canvas of w by h at (x, y), its pixels the device's
function pane(parent, x, y, w, h, dpr, cls = '') {
  const cv = el(parent, 'canvas', cls, `left:${x}px;top:${y}px;width:${w}px;height:${h}px`)
  cv.width = Math.round(w * dpr)
  cv.height = Math.round(h * dpr)
  const g = cv.getContext('2d')
  g.imageSmoothingEnabled = false
  return { cv, g }
}

// the film, a frame at a time, at the device's pixel ratio; with or without
// the clock on its hinge
let film = null
function filmAt(dpr) {
  if (film && film.dpr === dpr) return film
  const cv = document.createElement('canvas')
  cv.width = T.W * dpr
  cv.height = T.H * dpr
  const ov = document.createElement('canvas')
  ov.width = cv.width
  ov.height = cv.height
  const round = createRound(cv, ov, { scale: dpr })
  const out = document.createElement('canvas')
  out.width = cv.width
  out.height = cv.height
  film = { dpr, cv, ov, round, out }
  return film
}
function frame(f, dpr, { clock = true } = {}) {
  const F = filmAt(dpr)
  F.round.frame(f)
  F.round.renderer.gl.finish()
  const g = F.out.getContext('2d')
  g.imageSmoothingEnabled = false
  g.clearRect(0, 0, F.out.width, F.out.height)
  g.drawImage(F.cv, 0, 0)
  if (clock) g.drawImage(F.ov, 0, 0)
  return F.out
}
// part of a frame (film px) laid at (x, y) on the poster, a pixel for a pixel
function crop(parent, src, sx, sy, sw, sh, x, y, dpr) {
  const { g } = pane(parent, x, y, sw, sh, dpr, 'px')
  g.drawImage(src, sx * dpr, sy * dpr, sw * dpr, sh * dpr, 0, 0, sw * dpr, sh * dpr)
}

// a letter as it stands on the wall, in its colour or another's; `dim`
// turns its backlight down, as an unlit screen's is
function letter(parent, x, y, w, h, dpr, i, colour, dim = 0) {
  const L = T.LINKS[i]
  const { g } = pane(parent, x, y, w, h, dpr)
  g.imageSmoothingEnabled = true
  drawScreen(g, 0, 0, w * dpr, h * dpr, {
    colour: colour || L.colour, bat: L.bat, stamp: L.stamp, greet: L.greet,
    text: T.typed[i].full, full: T.typed[i].full, keys: 'wall',
  })
  if (dim > 0) {
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = `rgba(8, 7, 11, ${dim})`
    g.fillRect(0, 0, w * dpr, h * dpr)
    g.globalCompositeOperation = 'source-over'
  }
}

// the lockup, drawn at whole pixels a cell, in chalk (its ink spans rows 2
// to 30 of 33; `y` is the top of its box)
function lockup(parent, x, y, dpr, cell = 2) {
  const [lw, lh] = LOCKUP_SIZE
  const { g } = pane(parent, x, y, lw * cell, lh * cell, dpr)
  drawLockup(g, 0, 0, cell * dpr, CHALK)
}

// the signature every poster shares: the lockup on the bottom margin at the
// left, the address on its baseline at the right
function signoff(parent, dpr, { colour = ASH } = {}) {
  const cell = 2
  const y = PH - M - 31 * cell
  lockup(parent, M, y, dpr, cell)
  // the word's baseline is the lockup's row 21
  el(parent, 'div', 'mono', `right:${M}px;top:${y + 21 * cell - 19}px;font-size:22px;line-height:22px;color:${colour}`, 'celestual.us')
}

// the line, in the display cut: lowercase, one word in italic at most
const LINE3 = 'every letter<br>on the wall is<br>to <i>somebody.</i>'
const LINE2 = 'every letter on the wall<br>is to <i>somebody.</i>'
// set so its first baseline lands on `base` (measured, not guessed)
function headline(parent, x, base, size, html, { lh = 1, css = '' } = {}) {
  const e = el(parent, 'p', 'head', `left:${x}px;top:0;font-size:${size}px;line-height:${lh};${css}`, html)
  const probe = document.createElement('span')
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
  e.insertBefore(probe, e.firstChild)
  const b = probe.getBoundingClientRect().top - e.getBoundingClientRect().top
  probe.remove()
  e.style.top = `${base - b}px`
  return e
}

// a split flap figure plate, as on the film's hinge, w by h at (x, y)
function plate(g, x, y, w, h, s, text, size, ink = CHALK) {
  const r = 0.12 * h
  const half = h / 2
  g.save()
  g.fillStyle = '#1E1D22'
  g.beginPath(); g.roundRect(x, y, w, half, [r, r, 0, 0]); g.fill()
  g.fillStyle = '#151418'
  g.beginPath(); g.roundRect(x, y + half, w, half, [0, 0, r, r]); g.fill()
  g.fillStyle = ink
  g.font = `400 ${size}px ${FACE}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, x + w / 2, y + half + 0.06 * size)
  g.fillStyle = '#08070B'
  g.fillRect(x, y + half - s, w, 2 * s)
  g.restore()
}
// a time on plates (hour, colon, 1, 4, merid), `h` tall, at (x, y), drawn at
// device scale `k`; returns its width
function clockTime(g, x, y, h, k, hour, merid, ink = CHALK) {
  const size = 1.08 * h
  const wide = 1.16 * h
  const narrow = 0.72 * h
  const gap = 0.07 * h
  let cx = x
  plate(g, cx * k, y * k, wide * k, h * k, k, String(hour), size * k, ink)
  cx += wide + gap
  g.fillStyle = ink
  const dot = 0.095 * h
  g.fillRect((cx + 0.05 * h) * k, (y + 0.31 * h) * k, dot * k, dot * k)
  g.fillRect((cx + 0.05 * h) * k, (y + 0.6 * h) * k, dot * k, dot * k)
  cx += 0.24 * h
  plate(g, cx * k, y * k, narrow * k, h * k, k, '1', size * k, ink)
  cx += narrow + gap
  plate(g, cx * k, y * k, narrow * k, h * k, k, '4', size * k, ink)
  cx += narrow + gap * 1.6
  plate(g, cx * k, y * k, wide * k, h * k, k, merid, size * k, ink)
  return cx + wide - x
}

// ── the posters ──
// where a time's figures sit on their plates: their baseline, from the top
const figureBase = (h) => 0.5 * h + 0.06 * 1.08 * h + 0.3 * 1.08 * h

export const POSTERS = {
  // the seam: yuna writing to the one who always stands, in rose, and above
  // her, mirrored, the bus where he stands, a night earlier; the lockup on
  // her phone, under its screen
  async seam(p, { dpr }) {
    const src = frame(630, dpr)
    crop(p, src, 0, 400, PW, PH, 0, 0, dpr)
    signoff(p, dpr, { colour: CHALK })
  },

  // the wall, left aligned: the line, and four letters, only the last lit
  async wallleft(p, { dpr }) {
    headline(p, M, 180, 96, LINE2, { lh: '90px' })
    const w = 330, h = 384, gap = 18
    for (let i = 0; i < 4; i++) letter(p, M + (i % 2) * (w + gap), 360 + Math.floor(i / 2) * (h + gap), w, h, dpr, i, i === 3 ? null : 'night')
    signoff(p, dpr)
  },

  // the wall, held on its axis: the line, then the four, three of them with
  // their backlight down and only the last lit
  async wall(p, { dpr }) {
    headline(p, 0, 180, 96, LINE2, { lh: '90px', css: 'width:1080px;text-align:center' })
    const w = 342, h = 402, gap = 24
    const x0 = (PW - (2 * w + gap)) / 2
    for (let i = 0; i < 4; i++) letter(p, x0 + (i % 2) * (w + gap), 330 + Math.floor(i / 2) * (h + gap), w, h, dpr, i, i === 3 ? null : 'night', i === 3 ? 0 : 0.42)
    signoff(p, dpr)
  },

  // the wall, one held up: the last letter large and lit, the three before
  // it small and dark, in the order they went up
  async wallone(p, { dpr }) {
    headline(p, M, 180, 96, LINE2, { lh: '90px' })
    letter(p, M, 360, 540, 630, dpr, 3)
    const sh = 192
    for (let i = 0; i < 3; i++) letter(p, M + 540 + 36, 360 + i * (sh + 27), PW - M - (M + 540 + 36), sh, dpr, i, 'night')
    signoff(p, dpr)
  },

  // one letter: yuna's, lit, over the bus where he stands
  async letter(p, { dpr }) {
    const src = frame(50, dpr, { clock: false })
    crop(p, src, 0, 960, PW, 960, 0, 390, dpr)
    headline(p, M, 180, 96, LINE2, { lh: '90px' })
    letter(p, M, 450, 450, 540, dpr, 3)
    signoff(p, dpr, { colour: CHALK })
  },

  // round: the four at their stations on a dial, each to the next, the last
  // to the first, the line at its centre
  async round(p, { dpr }) {
    const cx = 540, cy = 630, R = 372
    const { g } = pane(p, 0, 0, PW, PH, dpr)
    g.imageSmoothingEnabled = true
    g.strokeStyle = 'rgba(244, 241, 234, 0.4)'
    g.lineWidth = 2 * dpr
    const gapA = 0.34
    for (let k = 0; k < 4; k++) {
      const a0 = -Math.PI / 2 + (k * Math.PI) / 2 + gapA
      const a1 = a0 + Math.PI / 2 - 2 * gapA
      g.beginPath(); g.arc(cx * dpr, cy * dpr, R * dpr, a0, a1); g.stroke()
      const a = (a0 + a1) / 2
      g.save()
      g.translate((cx + R * Math.cos(a)) * dpr, (cy + R * Math.sin(a)) * dpr)
      g.rotate(a + Math.PI / 2)
      g.beginPath(); g.moveTo(-9 * dpr, -9 * dpr); g.lineTo(0, 0); g.lineTo(-9 * dpr, 9 * dpr)
      g.strokeStyle = CHALK
      g.stroke()
      g.restore()
    }
    const at = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]]
    const ph = 54
    T.LINKS.forEach((L, i) => {
      const [x, y] = at[i]
      const [hm, merid] = L.clock.split(' ')
      const w = 4.04 * ph
      clockTime(g, x - w / 2, y - ph / 2 - 20, ph, dpr, hm.split(':')[0], merid)
      const lit = i === T.N - 1
      const greet = L.greet === 'to the one who always stands' ? 'to the one who<br>always stands' : L.greet
      headline(p, x - 210, y + 60, 36, greet, { lh: '38px', css: `width:420px;text-align:center;font-style:italic;color:${lit ? '#DF93AF' : CHALK}` })
    })
    headline(p, 0, cy - 30, 72, LINE3, { lh: '72px', css: 'width:1080px;text-align:center' })
    signoff(p, dpr)
  },

  // the contact sheet: the four worlds at once, each writer's phone lit
  async sheet(p, { dpr }) {
    const src = frame(700, dpr, { clock: false })
    crop(p, src, 78, 336, 924, 984, 78, 186, dpr)
    headline(p, M, 140, 60, 'every letter on the wall is to <i>somebody.</i>')
    signoff(p, dpr)
  },

  // the clock: the night as a board, four times, four greetings, then the line
  async clock(p, { dpr }) {
    const { g } = pane(p, 0, 0, PW, PH, dpr)
    g.imageSmoothingEnabled = true
    const h = 120
    T.LINKS.forEach((L, i) => {
      const y = M + i * 2 * M
      const [hm, merid] = L.clock.split(' ')
      clockTime(g, M, y, h, dpr, hm.split(':')[0], merid)
      const lit = i === T.N - 1
      const greet = L.greet === 'to the one who always stands' ? 'to the one who<br>always stands' : L.greet
      // each greeting on its figures' baseline (the two line one ends there)
      headline(p, M + 546, y + figureBase(h) - (lit ? 56 : 0), 52, greet, { lh: '56px', css: `font-style:italic;color:${lit ? '#DF93AF' : CHALK}` })
    })
    headline(p, M, 945, 96, LINE2, { lh: '90px' })
    signoff(p, dpr)
  },
}

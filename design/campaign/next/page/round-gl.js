// ── the renderer ───────────────────────────────────────────────────────────
// WebGL2, as the studio's wall is. Each world is drawn into a texture of its
// own cells (a tone, a palette and a crest a cell), then one full resolution
// pass lays the halves, the pane, the end card and the cascade together.
// Nothing here keeps time: every call is given the frame's facts.

import { PRELUDE, MAIN, WORLD_SRC, PLATEAU, COMPOSITE } from './round-worlds.js'
import { arrivalMap, BW, BH } from './round-flood.js'

const VS = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`

// the palette order the programs use
export const PALS = ['night', 'amber', 'acid', 'green', 'ice', 'violet-yellow', 'rose']
export const palIndex = (name) => Math.max(0, PALS.indexOf(name))

function compile(gl, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s) || 'shader'
      const lines = src.split('\n')
      const m = /ERROR: \d+:(\d+)/.exec(log)
      const at = m ? `\n> ${lines[+m[1] - 1]}` : ''
      throw new Error(log + at)
    }
    return s
  }
  const p = gl.createProgram()
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
  gl.bindAttribLocation(p, 0, 'a')
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
  const u = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i)
    const base = info.name.replace(/\[0\]$/, '')
    u[base] = gl.getUniformLocation(p, info.name)
    if (info.size > 1) for (let k = 0; k < info.size; k++) u[`${base}[${k}]`] = gl.getUniformLocation(p, `${base}[${k}]`)
  }
  return { p, u }
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)

// the part of a half a contact sheet module shows: as much as the module's
// shape holds, at square cells, about the middle but never past the phone's
// near edge, so the phone held up in it is whole (x, y, w, h in px)
export function sheetCrop(sw, sh) {
  const ar = sw / sh
  return ar < 1080 / 960 ? [Math.min((1080 - 960 * ar) / 2, 48), 0, 960 * ar, 960] : [0, (960 - 1080 / ar) / 2, 1080, 1080 / ar]
}

export function createRenderer(canvas, { blue, palettes, layout = { slots: [[0, 0, 444, 474]], lineY: 0, lockY: 0 } }) {
  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: false })
  if (!gl) throw new Error('webgl2')
  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  // the programs, made when first needed
  const worlds = []
  const worldProg = (k) => worlds[k] || (worlds[k] = compile(gl, PRELUDE + WORLD_SRC[k] + MAIN))
  const comp = compile(gl, COMPOSITE)

  const tex = (w, h, { filter = gl.NEAREST, wrap = gl.CLAMP_TO_EDGE, fmt = gl.RGBA8, src = gl.RGBA, type = gl.UNSIGNED_BYTE, data = null } = {}) => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.LINEAR_MIPMAP_LINEAR ? gl.LINEAR : filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, src, type, data)
    return t
  }
  // the blue noise, and each world's arrival map
  const tBlue = tex(128, 128, { fmt: gl.R8, src: gl.RED, data: blue, wrap: gl.REPEAT })
  const tArr = []
  for (let k = 0; k < 6; k++) tArr[k] = tex(BW, BH, { fmt: gl.R8, src: gl.RED, data: arrivalMap(k) })
  // a mask per panel slot (four halves, six small worlds), filled from canvases
  const tFig = []
  for (let k = 0; k < 10; k++) tFig[k] = tex(4, 4, { filter: gl.LINEAR_MIPMAP_LINEAR })
  // the panels: four halves of 180 by 160 cells, and the contact sheet's
  // small worlds, each its module's size in cells
  const panel = (w, h) => {
    const t = tex(w, h)
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    return { t, fb, w, h }
  }
  const halves = [0, 1, 2, 3].map(() => panel(180, 160))
  const [, , sw, sh] = layout.slots[0]
  const sheets = [0, 1, 2, 3, 4, 5].map(() => panel(sw / 6, sh / 6))
  const crop = sheetCrop(sw, sh)
  sheets.forEach((s) => { s.crop = crop })
  const slots = new Float32Array(24)
  layout.slots.forEach((r, i) => slots.set(r, i * 4))
  let tCards = tex(4, 4, { filter: gl.LINEAR })
  let cardRects = new Float32Array(48)
  let sheetPhones = new Float32Array(24)
  const tPhone = tex(4, 4, { filter: gl.LINEAR })
  // the palettes, seven of four
  const pal = new Float32Array(28 * 3)
  PALS.forEach((name, i) => palettes[name].forEach((h, j) => pal.set(hexRgb(h), (i * 4 + j) * 3)))

  function setMask(slot, cv) {
    gl.bindTexture(gl.TEXTURE_2D, tFig[slot])
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv)
    gl.generateMipmap(gl.TEXTURE_2D)
  }
  function setPhone(cv) {
    gl.bindTexture(gl.TEXTURE_2D, tPhone)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv)
  }
  function setCards(cv, rects, phones) {
    gl.deleteTexture(tCards)
    tCards = tex(cv.width, cv.height, { filter: gl.LINEAR })
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv)
    cardRects = new Float32Array(48)
    rects.forEach((r, i) => cardRects.set(r, i * 4))
    sheetPhones = new Float32Array(24)
    if (phones) sheetPhones.set(phones.slice(0, 24))
  }

  // one world into one panel
  function drawWorld(target, maskSlot, w) {
    const pr = worldProg(w.world)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb)
    gl.viewport(0, 0, target.w, target.h)
    gl.useProgram(pr.p)
    const u = pr.u
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tBlue); gl.uniform1i(u.uBlue, 0)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tFig[maskSlot]); gl.uniform1i(u.uFig, 1)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tArr[w.world]); gl.uniform1i(u.uArr, 2)
    gl.uniform2f(u.uRes, target.w, target.h)
    gl.uniform2f(u.uView, 1080, 960)
    const cr = target.crop || [0, 0, 1080, 960]
    gl.uniform4f(u.uCrop, cr[0], cr[1], cr[2], cr[3])
    gl.uniform1f(u.uW, w.clock)
    gl.uniform1f(u.uFlood, w.flood || 0)
    gl.uniform1f(u.uLetter, palIndex(w.palette))
    gl.uniform1f(u.uLook, w.look || 0)
    gl.uniform1f(u.uPlateau, PLATEAU[w.world])
    gl.uniform2f(u.uNoiseOff, 37 * w.world + 11, 71 * w.world + 5)
    const ph = w.phoneRect || [0, 0, 0, 0]
    gl.uniform4f(u.uPhone, ph[0], ph[1], ph[2], ph[3])
    gl.uniform1f(u.uPhoneLit, w.phoneLit || 0)
    gl.uniform1f(u.uSent, w.sent == null ? -1 : w.sent)
    if (u.uSun) gl.uniform1f(u.uSun, w.sun || 0)
    if (u.uOff && w.lampsOff) gl.uniform1fv(u.uOff, w.lampsOff)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  // the composite: which source is where, the pane, the end
  function composite(c) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(comp.p)
    const u = comp.u
    for (let k = 0; k < 4; k++) { gl.activeTexture(gl.TEXTURE0 + k); gl.bindTexture(gl.TEXTURE_2D, halves[k].t); gl.uniform1i(u[`uTex[${k}]`], k) }
    for (let k = 0; k < 6; k++) { gl.activeTexture(gl.TEXTURE4 + k); gl.bindTexture(gl.TEXTURE_2D, sheets[k].t); gl.uniform1i(u[`uSheet[${k}]`], 4 + k) }
    gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, tCards); gl.uniform1i(u.uCards, 10)
    gl.uniform2f(u.uCanvas, canvas.width, canvas.height)
    gl.uniform3fv(u.uPal, pal)
    gl.uniform1i(u.uTop, c.top)
    gl.uniform1i(u.uBot, c.bot)
    gl.uniform1i(u.uFront, c.front ?? 1)
    gl.uniform1i(u.uBack, c.back ?? 1)
    gl.uniform1f(u.uTh, c.th || 0)
    gl.uniform1f(u.uPane, c.pane ? 1 : 0)
    gl.uniform1f(u.uRipple, c.ripple || 0)
    gl.uniform1f(u.uT, c.f || 0)
    gl.uniform1f(u.uEnd, c.end ? 1 : 0)
    const flips = new Float32Array(6)
    flips.set((c.flips || []).slice(0, 6))
    gl.uniform1fv(u.uFlip, flips)
    gl.uniform1i(u.uSlots, layout.slots.length)
    gl.uniform4fv(u.uSlot, slots)
    gl.uniform1f(u.uLineY, layout.lineY)
    gl.uniform1f(u.uLockY, layout.lockY)
    gl.uniform1f(u.uLine, c.line ? 1 : 0)
    gl.uniform1f(u.uLock, c.lockup ? 1 : 0)
    gl.uniform4fv(u.uCardRect, cardRects)
    gl.uniform4fv(u.uSheetPhone, sheetPhones)
    gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, tPhone); gl.uniform1i(u.uPhoneTex, 11)
    const pr = c.phone || [0, 0, 0, 0]
    gl.uniform4f(u.uPhoneRect, pr[0], pr[1], pr[2], pr[3])
    gl.uniform1f(u.uPhoneOn, c.phone ? 1 : 0)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  // read a panel's cells back, for the checks
  function readPanel(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb)
    const out = new Uint8Array(target.w * target.h * 4)
    gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.UNSIGNED_BYTE, out)
    return out
  }

  return { gl, halves, sheets, panel, drawWorld, composite, setMask, setCards, setPhone, readPanel, worldProg }
}

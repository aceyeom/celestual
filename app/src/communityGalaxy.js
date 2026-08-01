// communityGalaxy.js — the living sky of ONE community.
//
// A different instrument from the ambient backdrop (galaxy.js), on the same
// engine. There, stars are procedural weather. Here the sky is LIVE and
// COUNTABLE: every disk star is one real ping, the field starts empty and fills
// as pings arrive, and matches are only ever a NUMBER in the readout — nothing
// in the sky marks one, so watching it can never reveal who matched whom. That
// anonymity is structural, not incidental. It is the double-blind, kept.
//
// Rewritten on sky/. What this buys, beyond the shared engine's HDR, blackbody
// colour, volumetric gas and resolving star bodies:
//
//   · THE GALAXY GENUINELY GROWS. The old model divided each ping's radius by a
//     fixed cap of 1,200, so the 1,201st ping silently re-scaled every existing
//     star's position and a community past the cap simply stopped growing. Here
//     a slot's radius is ABSOLUTE — sqrt(index), in world units — so a
//     community going from 100 members to 10,000 moves nobody: the disk really
//     is bigger, and the camera simply stands further back to hold it. Size is
//     felt because size is real.
//   · a gathering community's proto-cloud and an open community's spiral are
//     the SAME volumetric field with different parameters, so crossing the
//     privacy floor RESOLVES the nebula into a galaxy in place, over a few
//     seconds, instead of cross-fading between two baked clouds.
//   · the tap-wave is a real wavefront: it lights the gas, flares the stars it
//     crosses, and rides the disk plane in 3D.
//
// Every method App.jsx, ui.jsx and CommunityScreen call has the same signature
// it had before.

import { SkyEngine, clamp, lerp, linearOf, starRadius } from './sky/engine.js'
import { smooth, easeOut, easeFlight } from './sky/camera.js'
import {
  STAR_STRIDE, genHalo, genDeepField, genNearField, genDisk,
  writeStar, writeSlot, slotRadius, diskRadiusFor, omegaAt, TILT_RATE,
} from './sky/model.js'
import { tempToU, blackbodyRGB } from './sky/blackbody.js'
import { Gestures } from './sky/gestures.js'
import { CATEGORY_TINTS } from './theme.js'
import { bakeTag } from './sky/fx.js'
import { Community2D } from './sky/fallback2d.js'

const TWO = Math.PI * 2
const METEOR_DUR = 1.2 // a new ping's streak in
const IGNITE_DUR = 0.6 // the glisten when it lands
const ZOOM_MAX = 14
const DBLTAP_STEP = 2.6
// How far past the lit population the framing stands. Slightly generous: the
// rim is ALLOWED to spill past the frame, because a galaxy that fits neatly
// inside its box reads as a graphic rather than as a place.
const FRAME_PAD = 1.32

// The star a ping is, in one place — so the CPU can size its disc exactly the
// way stars.js's vertex shader does, which is what the opaque body pass needs
// in order to draw where the point of light actually was. galaxy.js carries the
// same three constants for the same reason.
const HERO_TEMP = 7400
const HERO_LUM = 4.4
const HERO_RGB = blackbodyRGB(HERO_TEMP)
const SURFACE_B = 1.34

export class CommunityGalaxy extends SkyEngine {
  constructor(canvas, opts = {}) {
    super(canvas, opts)
    if (!this.ok) return new Community2D(canvas, opts)

    // ── the live population ──
    this.stars = [] // one per ping: { i, state, born, settleAt, mine, label, kind }
    this.mine = [] // the viewer's own: [{ st, label, kind }]
    this.mineCursor = 0
    this.forming = false
    this.formingBlend = 0 // eases 0..1, so the floor CROSSING is a resolve
    this.holdDur = 1.9

    // ── the @ layer ──
    this.publicList = []
    this.ownPublic = null
    this.publicTags = []
    this.tagsEnabled = false
    this.onTagTap = null
    this._tagsAt = 0

    // ── interaction ──
    this.zoomEnabled = false
    this.onZoomState = null
    this._zoomActive = false
    this.dive = null // kept for the screens that read `g.dive && g.dive.held`
    this.diveSt = null
    this.diveLabel = null

    this._dirty = true
    this._build()
    this._bindHand()
    this.start()
  }

  // ── the population ────────────────────────────────────────────────────────
  _build() {
    const b = this.budget
    const mobile = window.innerWidth < 540
    const scale = mobile ? 0.66 : 1

    // The countable stars. One buffer, regrown whenever the community does.
    // This is the only group the governor is never allowed to thin: the pings
    // are the CONTENT, and dropping half of them would make the sky a lie.
    // radiusScale is what decides how readily a ping stops being a POINT and
    // opens into a disc. Held low on purpose: a ping is one person, and a sky
    // of soft bokeh saucers reads as out of focus rather than as a crowd. It
    // still resolves into a body — but only once you have actually flown to it.
    this.gPings = this.starPass.createGroup(new Float32Array(STAR_STRIDE * 64), { gain: 0.28, radiusScale: 0.00052, dynamic: true })
    this.gPings.count = 0

    // Everything else is scenery, and an EMPTY community still opens onto a
    // real universe — the pings are what is missing, not the cosmos. Sparse by
    // intent: the countable stars are the content here, and a busy decorative
    // field is the fastest way to make them uncountable.
    this.gDeep = this.starPass.createGroup(genDeepField(Math.floor(b.deep * scale * 0.5), { seed: 5501, rMin: 3.0, rMax: 28 }), {
      gain: 0.24, radiusScale: 0.00012, twinkle: 0.8, motion: 0.55, resolve: 0, pattern: 0,
    })
    this.gHalo = this.starPass.createGroup(genHalo(Math.floor(b.stars * 0.04 * scale), { seed: 5503, rMin: 1.1, rMax: 3.2 }), {
      gain: 0.045, radiusScale: 0.0003, resolve: 0, pattern: 0,
    })
    // Unresolved starlight along the lanes: the connective glow that makes the
    // arms read as continuous rather than as a dotted line of pings. Seeded on
    // the SAME orbit family the pings seat on, so it thickens exactly the arms
    // the population is describing rather than lying beside them. Scenery, so
    // it is among the first things the governor thins.
    this.gArm = this.starPass.createGroup(
      genDisk(Math.floor(b.stars * 0.10 * scale), { seed: 5507, rCore: 0.14, rDisk: 0.85, armFrac: 0.72 }),
      { gain: 0.028, radiusScale: 0.0003, twinkle: 0.7, resolve: 0 },
    )
    this.gNear = this.starPass.createGroup(genNearField(b.passers, { seed: 5509, extent: 2.6 }), {
      gain: 0.04, radiusScale: 0.00002, resolve: 0, nearFade: 0.55, pattern: 0,
    })
    this.gNear.inFront = true

    this.gHero = this.starPass.createHeroGroup(96)
    this.gHero.inFront = true
    this.gHero.radiusScale = 0.0062
    this.gHero.twinkle = 0.1 // a held star holds still (galaxy.js says why)

    this._tuneGas()
    this._tunePost()
    this._reframe()
  }

  // The governor moved the budget: throw the scenery away and regenerate it at
  // the new density. The countable population is not regenerated so much as
  // re-uploaded — `_syncPings` rebuilds it from the ping list, which is the
  // authority — so the pings are never traded away for frame rate. They are the
  // content; everything else in this sky is weather.
  _rebuild() {
    this.starPass.clear()
    this._armR = 0
    this._build()
    this._dirty = true
  }

  _tuneGas() {
    const g = this.gasPass
    g.arms = 2
    g.dust = 1.0
    g.warm = linearOf('#FFB37A', 1.0)
    g.mid = linearOf(this.them, 0.95)
    g.cool = linearOf('#6E7BD8', 0.9)
  }
  _tunePost() {
    const p = this.post
    p.bloomAmount = 0.2
    p.threshold = 1.5
    p.knee = 0.55
    p.vignette = 0.4
  }
  _paletteChanged() {
    this._tuneGas()
    this.sprites.textures.clear() // the pills carry the palette
    this._dirty = true
  }

  // ── framing: the galaxy grows, the camera stands back ─────────────────────
  // This is the whole growth story in six lines. Nothing is normalized against
  // a cap; the disk's radius is whatever the outermost real ping's radius is,
  // and the camera is placed to hold that. Ten thousand members is a genuinely
  // bigger galaxy seen from genuinely further away, and not one existing star
  // has moved to make room.
  _reframe() {
    let maxIndex = this.stars.length - 1
    for (const st of this.stars) if (st.i > maxIndex) maxIndex = st.i
    const R = diskRadiusFor(Math.max(maxIndex + 1, 40))
    this.diskR = R
    this.setFrameRadius(R * FRAME_PAD)
    // the connective arm glow is generated at a radius, so a galaxy that has
    // grown well past it needs it regrown. Hysteresis keeps a busy evening from
    // rebuilding a buffer on every ping.
    if (!this._armR || Math.abs(R - this._armR) / this._armR > 0.35) {
      this._armR = R
      const b = this.budget
      const scale = window.innerWidth < 540 ? 0.66 : 1
      const data = genDisk(Math.floor(b.stars * 0.1 * scale), {
        seed: 5507, rCore: Math.max(0.1, R * 0.16), rDisk: Math.max(0.3, R * 0.94), armFrac: 0.72,
      })
      if (this.gArm) this.starPass.updateGroup(this.gArm, data)
    }
    const g = this.gasPass
    g.diskR = Math.max(0.42, R * 1.12)
    g.diskH = Math.max(0.03, R * 0.075)
    // The gas frontier follows the population, so a young community is a tight
    // bright knot and a grown one wears the full spiral. Below the floor the
    // whole disk is cloud, so the frontier is irrelevant.
    g.fill = this.forming ? 99 : Math.max(0.22, R * 0.98)
  }

  // ── the live API ──────────────────────────────────────────────────────────
  get count() {
    return this.stars.length
  }

  _mineEntry(m) {
    if (m && typeof m === 'object') return { label: m.label || null, kind: m.kind || '' }
    return { label: m || null, kind: '' }
  }

  // Rebuild the countable star buffer. Called whenever the population changes;
  // at ten thousand pings this is a 320 KB upload, which is nothing next to
  // doing it per frame the way a CPU renderer would have to.
  _syncPings() {
    const n = this.stars.length
    const buf = new Float32Array(Math.max(1, n) * STAR_STRIDE)
    for (let k = 0; k < n; k++) {
      const st = this.stars[k]
      const geom = writeSlot(buf, k, st.i, st.mine ? 977 : 0)
      st.geom = geom
      // the viewer's own stars are drawn by the hero pass, so blank their slot
      // in the countable buffer rather than drawing them twice
      if (st.mine || st.state === 'meteor') buf[k * STAR_STRIDE + 7] = 0
    }
    this.starPass.updateGroup(this.gPings, buf)
    this.gPings.count = n
    this._dirty = false
    this._reframe()
    // A ping is drawn at the instrument's point-spread size, which does not
    // shrink when the galaxy does — so without this, forty pings on a small
    // disk render exactly as loud as a thousand on a large one and read as a
    // scatter of beacons. Prominence rises linearly with how full the sky is.
    const fill = clamp(n / 900, 0, 1)
    this.gPings.gain = 0.12 + 0.2 * fill
    this.gArm.gain = 0.010 + 0.026 * fill
  }

  // Where ping k's star is in the world, right now.
  _slotWorld(st, out) {
    const g = st.geom
    if (!g) return null
    const phi = g.phi + omegaAt(g.a) * this.orbitT
    const th = TILT_RATE * g.a + this.pattern
    const ex = g.a * Math.cos(phi)
    const ez = g.b * Math.sin(phi)
    const ct = Math.cos(th), st2 = Math.sin(th)
    out = out || {}
    out.x = ex * ct - ez * st2
    out.z = ex * st2 + ez * ct
    out.y = g.y
    return out
  }

  seed(n, mine = []) {
    n = Math.max(0, Math.floor(n))
    this.stars = []
    this.mine = []
    this.mineCursor = 0
    this.dive = null
    this.diveSt = null
    this.diveLabel = null
    if (this.cam.dive) this.cam.dive = null
    for (let i = 0; i < n; i++) {
      // a staggered settle: opening a busy sky must never fire a meteor shower
      this.stars.push({ i, state: 'rest', born: -10, settleAt: this.t + Math.random() * 1.1, mine: false })
    }
    for (const m of mine) this._restMine(this._mineEntry(m))
    this._syncPings()
    this._seatPublicTags()
    this.start()
  }

  // Your own stars are pushed a golden angle apart, so consecutive placements
  // never seat as touching neighbours (which reads as an artifact once each one
  // burns bright). `writeSlot`'s salt is what does it, deterministically.
  _restMine(entry) {
    const i = this.stars.length
    const st = { i, state: 'rest', born: -10, settleAt: this.t + Math.random() * 0.9, mine: true, label: entry.label, kind: entry.kind, spread: this.mine.length }
    this.stars.push(st)
    this.mine.push({ st, label: entry.label, kind: entry.kind })
    return st
  }

  syncMine(entries = []) {
    const want = entries.map((m) => this._mineEntry(m)).filter((m) => m.label)
    const have = new Map(this.mine.map((m) => [m.label, m]))
    let changed = false
    for (const e of want) {
      const cur = have.get(e.label)
      if (!cur) {
        this._restMine(e)
        changed = true
      } else if (cur.kind !== e.kind) {
        cur.kind = e.kind
        cur.st.kind = e.kind
      }
    }
    const labels = new Set(want.map((e) => e.label))
    for (const m of [...this.mine]) {
      if (m.label && !labels.has(m.label)) {
        const at = this.stars.indexOf(m.st)
        if (at >= 0) this.stars.splice(at, 1)
        this.mine.splice(this.mine.indexOf(m), 1)
        if (this.diveSt === m.st) this._endDive()
        changed = true
      }
    }
    if (changed) this._syncPings()
    this._seatPublicTags()
    this.start()
  }

  // Fire k new pings. Each arrives as a meteor and ignites in its slot — the
  // live "someone placed a ping" beat. Past a small burst the remainder settle
  // in quietly instead: a data catch-up must never read as a meteor storm.
  launch(k = 1, opts = {}) {
    const meteors = Math.min(k, 6)
    for (let j = 0; j < k; j++) {
      const i = this.stars.length
      const st = {
        i, state: 'meteor', born: this.t + j * 0.12, settleAt: 0,
        mine: !!opts.mine, label: opts.label || null, kind: opts.kind || '',
        spread: opts.mine ? this.mine.length : 0,
      }
      if (j >= meteors || this.reduced) {
        st.state = 'rest'
        st.born = -10
        st.settleAt = this.t + (this.reduced ? 0.01 : Math.random() * 0.9)
      }
      this.stars.push(st)
      if (opts.mine) this.mine.push({ st, label: opts.label || null, kind: opts.kind || '' })
    }
    this._syncPings()
    this._seatPublicTags()
    this.start()
    return this.stars.length
  }

  setCount(n) {
    n = Math.max(0, Math.floor(n))
    if (n < this.stars.length) {
      this.stars.length = n
      this.mine = this.mine.filter((m) => this.stars.includes(m.st))
      if (this.diveSt && !this.stars.includes(this.diveSt)) this._endDive()
      this._syncPings()
      this._seatPublicTags()
    } else if (n > this.stars.length) {
      this.launch(n - this.stars.length)
    }
    this.start()
  }

  // A gathering community withholds everyone else's count, so its sky is an
  // uncountable cloud. Crossing the floor is a RESOLVE, not a cut: formingBlend
  // eases and the same volumetric field tightens from a turbulent proto-cloud
  // into a spiral while the real stars fade up inside it.
  setForming(on) {
    const next = !!on
    if (next === this.forming) return
    this.forming = next
    this._reframe()
    this.start()
  }

  setPublicHandles(list = [], own = null) {
    this.publicList = (list || []).filter(Boolean).slice(0, 12)
    this.ownPublic = own || null
    this._seatPublicTags()
    this.start()
  }

  setTagsEnabled(on) {
    on = !!on
    if (on && !this.tagsEnabled) this._tagsAt = this.t
    this.tagsEnabled = on
    this.start()
  }

  // Seat each public @ on a deterministic resident star (hashed by handle, so a
  // tag never wanders between frames or mounts), skipping the viewer's own.
  // Tags prefer the disk's mid-body: never the luminous heart, where they would
  // pile over the community's seal, and never the thin far rim.
  _seatPublicTags() {
    const prior = new Map(this.publicTags.map((tg) => [tg.label, tg.vis]))
    const tags = []
    const n = this.stars.length
    if (n > 0) {
      const R = this.diskR || 1
      const used = new Set()
      const seatable = (idx) => {
        if (used.has(idx) || this.stars[idx].mine) return false
        const r = slotRadius(this.stars[idx].i)
        return r > R * 0.32 && r < R * 0.94
      }
      for (const label of this.publicList) {
        if (this.ownPublic && label === this.ownPublic) continue
        let h = 0
        for (let c = 0; c < label.length; c++) h = (h * 31 + label.charCodeAt(c)) >>> 0
        let idx = h % n
        let guard = 0
        while (!seatable(idx) && guard++ < n) idx = (idx + 7) % n
        if (!seatable(idx)) continue // a very young sky: better untagged than piled
        used.add(idx)
        tags.push({ st: this.stars[idx], label, own: false, tw: ((h % 100) / 100) * TWO, vis: prior.get(label) || 0 })
      }
    }
    if (this.ownPublic && this.mine.length) {
      tags.push({ st: this.mine[this.mine.length - 1].st, label: this.ownPublic, own: true, tw: 0, vis: prior.get(this.ownPublic) || 0 })
    }
    this.publicTags = tags
  }

  // ── the dives ─────────────────────────────────────────────────────────────
  locateMine(label, opts = {}) {
    if (!this.mine.length) return false
    let entry = null
    if (label) entry = this.mine.find((m) => m.label === label) || null
    if (!entry) {
      entry = this.mine[this.mineCursor % this.mine.length]
      this.mineCursor++
    }
    if (!entry || !this.stars.includes(entry.st)) return false
    this.diveSt = entry.st
    this.diveLabel = entry.label
    this.dive = { held: !!opts.hold }
    this.cam.startDive(() => this._slotWorld(entry.st), { hold: !!opts.hold })
    // the overlay's name and intent line ride this, not a timer (engine.js)
    this._armArrival(opts.onArrive)
    this.start()
    return true
  }

  // Fly to ANY resident star and stay with it — the meeting a tapped public @
  // opens. The exact grammar as find-your-star, so every dive in the product
  // arrives the same way.
  diveToStar(st) {
    if (!st || !this.stars.includes(st)) return false
    this.diveSt = st
    this.diveLabel = null // the screen's overlay owns the name here
    this.dive = { held: true }
    this.cam.startDive(() => this._slotWorld(st), { hold: true })
    this.start()
    return true
  }

  releaseDive() {
    if (this.cam.held) this.cam.releaseDive(0)
    if (this.dive) this.dive = { held: false }
    this._armArrival(null)
    this.start()
  }
  _endDive() {
    this.dive = null
    this.diveSt = null
    this.diveLabel = null
    this._armArrival(null)
    if (this.cam.dive) this.cam.dive = null
  }
  hasMine() {
    return this.mine.length > 0
  }

  // ── the hand ──────────────────────────────────────────────────────────────
  setZoomEnabled(on) {
    this.zoomEnabled = !!on
    this.gest.enabled = !!on
    this.cam.orbitHome = !on
    if (!on) this.resetView()
    this.start()
  }
  resetView() {
    this.cam.resetView()
    this.start()
  }

  _bindHand() {
    const held = () => this.cam.held
    this.gest = new Gestures({
      wheelAlways: held,
      getScale: () => (held() ? this.cam.diveDist : this.cam.zoomTarget),
      // A tap on the sky does nothing. It used to send a wavefront through the
      // disk plane, which was pretty and which nobody asked for: a backdrop
      // that flashes every time a thumb brushes it reads as a toy, and it
      // fought every real tap target sitting over the galaxy.
      onPinchStart: (x, y) => {
        if (!held() && this.cam.zoomTarget <= 1.04) this.cam.zoomFocus = this.cam.planePoint(x, y, (this.diskR || 1) * 1.4)
      },
      onPinch: (scaled, _base, inv) => {
        if (held()) this.cam.diveDist = clamp(inv, 0.4, 3.4)
        else this.cam.dollyTo(scaled)
        this.start()
      },
      onPan: (x0, y0, x1, y1) => {
        if (!held() && this.cam.zoom > 1.04) this._panBy(x0, y0, x1, y1)
      },
      onDrag: (dx, dy, x0, y0, x1, y1) => {
        this.cam.dragging = true
        if (this.cam.zoom > 1.06 && !held()) this._panBy(x0, y0, x1, y1)
        else this.cam.dragBy(dx * 0.0036, dy * 0.0028)
        this.start()
      },
      onRelease: () => this.cam.fling(),
      onTap: (x, y) => {
        // taps inside a held star view stay quiet — the hand there is for
        // orbiting around the person you have flown to
        if (held()) return
        const tag = this._tagAt(x, y)
        if (tag) {
          this.diveToStar(tag.st)
          if (this.onTagTap) this.onTagTap(tag.label, tag.own)
        }
      },
      onDoubleTap: (x, y) => {
        if (held()) return
        if (this.cam.zoomTarget > 2.6) this.resetView()
        else {
          this.cam.dollyTo(Math.min(Math.max(this.cam.zoomTarget, 1) * DBLTAP_STEP, ZOOM_MAX), this.cam.planePoint(x, y, (this.diskR || 1) * 1.4))
        }
        this.start()
      },
      onWheel: (dy, x, y) => {
        if (held()) {
          this.cam.diveDist = clamp(this.cam.diveDist * Math.exp(dy * 0.0014), 0.4, 3.4)
        } else if (this.zoomEnabled && !this.cam.dive) {
          const f = Math.exp(-dy * 0.0016)
          const nz = clamp(this.cam.zoomTarget * f, 1, ZOOM_MAX)
          if (nz > this.cam.zoomTarget && this.cam.zoomTarget <= 1.04) this.cam.zoomFocus = this.cam.planePoint(x, y, (this.diskR || 1) * 1.4)
          this.cam.dollyTo(nz)
        }
        this.start()
      },
    })
    this.gest.bind()
    this._pointerOwned = () => this.gest.owned
    this.cam.zoomMax = ZOOM_MAX
  }

  // slide the dolly's focus so the plane point under (x0,y0) lands under
  // (x1,y1) — the world follows the finger
  _panBy(x0, y0, x1, y1) {
    const lim = (this.diskR || 1) * 1.25
    const w0 = this.cam.planePoint(x0, y0, lim)
    const w1 = this.cam.planePoint(x1, y1, lim)
    let px = this.cam.zoomFocus.x + (w0.x - w1.x)
    let pz = this.cam.zoomFocus.z + (w0.z - w1.z)
    const rr = Math.hypot(px, pz)
    if (rr > lim) {
      const f = lim / rr
      px *= f
      pz *= f
    }
    this.cam.zoomFocus = { x: px, z: pz }
  }

  // Which public @ sits under a screen point. Generous: a handle is small and a
  // thumb is not.
  _tagAt(x, y) {
    if (!this.tagsEnabled || !this.publicTags.length) return null
    let best = null
    let bd = 44 * 44
    for (const tag of this.publicTags) {
      if (tag.vis < 0.25 || tag.sx == null) continue
      const dx = tag.sx - x
      const dy = tag.sy - y
      const d = dx * dx + dy * dy
      if (d < bd) {
        bd = d
        best = tag
      }
    }
    return best
  }

  // A tap becomes a wave in the DISK PLANE: a front of starlight sweeping
  // outward from the touched point, flaring the stars it crosses and lighting
  // the gas as it goes. The sky answers the hand in its own vocabulary, never
  // with a UI ring.
  // Retired, and kept only so nothing that still calls it breaks. The sky no
  // longer answers a tap with a burst of light.
  ripple() {}

  // ── the frame ─────────────────────────────────────────────────────────────
  _frame(dt) {
    this._checkArrival()
    // the forming <-> open resolve
    const want = this.forming ? 1 : 0
    if (Math.abs(this.formingBlend - want) > 0.001) {
      this.formingBlend = lerp(this.formingBlend, want, Math.min(1, dt * 0.55))
      this._reframe()
    } else {
      this.formingBlend = want
    }
    const fb = this.formingBlend
    const g = this.gasPass
    g.forming = fb
    g.turb = fb
    // A gathering sky IS its cloud, so the gas carries the whole frame there; an
    // open one is mostly stars, and the gas is the body they hang in.
    const fillFrac = clamp(this.stars.length / 900, 0, 1)
    g.gain = lerp(0.32 + 0.55 * fillFrac, 1.15, fb) * (1 - this.cam.focus * 0.88)

    if (this.cam.dive == null && this.dive) {
      this._endDive()
    }
    if (this._dirty) this._syncPings()

    // the countable stars fade all the way out below the floor: the count is
    // withheld, so there is nothing to count
    this.gPings.dim = 1 - fb
    this.gArm.dim = 1 - fb * 0.6

    this._frameZoomState()
    this._frameMeteors(dt)
    this._frameMine(dt)
    this._frameTags(dt)
    if (fb > 0.02) this._frameForming(dt, fb)
  }

  // the screen goes immersive once the zoom is a commitment, not a nudge, and
  // comes back a little below that so the chrome never flickers at the edge
  _frameZoomState() {
    const active = this._zoomActive ? this.cam.zoom > 1.18 : this.cam.zoom > 1.32
    if (active !== this._zoomActive) {
      this._zoomActive = active
      if (this.onZoomState) this.onZoomState(active)
    }
  }

  // ── new pings arriving ────────────────────────────────────────────────────
  // A slim streak decelerating out of deep space into its slot, then a
  // diffraction glisten as it lands. Now real light in the HDR buffer, so it
  // blooms through the same optics as the stars it is flying between.
  _frameMeteors(dt) {
    void dt
    const white = [1, 0.97, 0.93]
    const col = linearOf(this.you)
    let settled = false
    for (const st of this.stars) {
      if (st.state === 'meteor') {
        if (this.t < st.born) continue
        const p = clamp((this.t - st.born) / METEOR_DUR, 0, 1)
        const w = this._slotWorld(st)
        const scr = w && this.cam.project(w.x, w.y, w.z)
        if (!scr) {
          st.state = 'rest'
          settled = true
          continue
        }
        if (p >= 1) {
          st.state = 'ignite'
          st.igniteAt = this.t
          settled = true
          continue
        }
        // entry point: off-frame, roughly opposite the landing slot, so the
        // streak crosses real sky
        if (st.ox == null) {
          const side = scr.sx < this.w / 2 ? 1 : -1
          const a = -Math.PI / 2 + side * (0.3 + Math.random() * 0.5)
          const dist = Math.max(this.w, this.h) * (0.36 + Math.random() * 0.18)
          st.ox = scr.sx + Math.cos(a) * dist
          st.oy = scr.sy + Math.sin(a) * dist
          st.bow = (Math.random() - 0.5) * 0.36
        }
        const e = easeOut(p)
        const mx = (st.ox + scr.sx) / 2 - (scr.sy - st.oy) * st.bow
        const my = (st.oy + scr.sy) / 2 + (scr.sx - st.ox) * st.bow
        const at = (u) => [
          (1 - u) * (1 - u) * st.ox + 2 * (1 - u) * u * mx + u * u * scr.sx,
          (1 - u) * (1 - u) * st.oy + 2 * (1 - u) * u * my + u * u * scr.sy,
        ]
        const [hx, hy] = at(e)
        // fades in as it enters, and melts back with the rest of the field
        // during a dive so the hero star holds alone
        const enter = smooth(clamp(p / 0.2, 0, 1)) * (1 - this.cam.focus * 0.75) * this.dim
        for (let k = 1; k <= 14; k++) {
          const u = Math.max(0, e - (k / 14) * 0.2)
          const [px, py] = at(u)
          const q = 1 - k / 14
          this.fx.screen(px, py, 3 + q * 8, k < 4 ? white : col, q * q * 2.2 * enter, 0)
        }
        this.fx.screen(hx, hy, 30, col, 1.9 * enter, 0)
        this.fx.screen(hx, hy, 6.5, white, 8 * enter, 0)
      } else if (st.state === 'ignite') {
        const q = (this.t - st.igniteAt) / IGNITE_DUR
        if (q >= 1) {
          st.state = 'rest'
          settled = true
          continue
        }
        const w = this._slotWorld(st)
        if (!w) continue
        const bell = Math.sin(Math.PI * clamp(q, 0, 1))
        // A ping landing is a SPARK, not a flare. Sized against the disk it was
        // most of a screen-width of soft light, which reads as a blurred blob
        // drifting over the page rather than as a star arriving in its slot.
        const R = Math.max(0.4, this.diskR || 1)
        this.fx.world(w.x, w.y, w.z, (0.055 + bell * 0.14) * R, white, bell * 3.0 * this.dim, 2)
        this.fx.world(w.x, w.y, w.z, (0.028 + bell * 0.07) * R, col, bell * 2.0 * this.dim, 0)
      }
    }
    // a meteor that landed is now an ordinary resident: put its light back into
    // the countable buffer
    if (settled) this._dirty = true
  }

  // ── the viewer's own stars ────────────────────────────────────────────────
  _frameMine(dt) {
    void dt
    const hero = this.gHero
    hero.count = 0
    if (!this.mine.length) return
    const focusing = this.cam.focus > 0.001
    for (const m of this.mine) {
      const st = m.st
      if (st.state === 'meteor') continue
      const g = st.geom
      if (!g) continue
      const isDive = focusing && st === this.diveSt
      const f = isDive ? this.cam.focus : 0
      const fade = focusing && !isDive ? 1 - 0.86 * this.cam.focus : 1
      if (fade <= 0.03) continue
      let settle = 1
      if (st.settleAt > 0) settle = smooth(clamp((this.t - st.settleAt) / 0.9, 0, 1))
      if (settle <= 0.01) continue
      const tint = CATEGORY_TINTS[m.kind] || this.you
      const tcol = linearOf(tint)
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 1.1 + st.i)
      const gain = (0.38 + pulse * 0.06) * settle * fade * (1 - f * 0.80) * (1 - this.formingBlend * 0.15)
      // the same dressing your star wears in the ambient sky, so a ping looks
      // like YOUR ping in whichever sky is behind the app
      // One quiet tinted halo, exactly as in the ambient sky, and sized in
      // proportion to THIS community's disk — so a sky with forty pings wears
      // forty small lights rather than forty beacons on a tiny galaxy.
      const w = this._slotWorld(st)
      // shrinks and fades INTO the dive rather than growing with it — galaxy.js
      // carries the note on why (a world-space sphere magnified fiftyfold is a
      // full-frame wash of category colour, not a halo)
      if (w && fade > 0.05) {
        const near = 1 - f * 0.94
        const R = Math.max(0.35, this.diskR || 1)
        this.fx.world(w.x, w.y, w.z, (0.042 + pulse * 0.006) * near * R, tcol, (0.5 + pulse * 0.14) * settle * fade * (1 - f * 0.9), 0)
      }
      if (hero.count >= hero.capacity) break
      const k = hero.count++
      writeStar(hero.star, k, g.a, g.b, g.phi, omegaAt(g.a), TILT_RATE * g.a, g.y, tempToU(HERO_TEMP), HERO_LUM)
      const c = linearOf(tint)
      const o = k * 4
      hero.tint[o] = c[0]
      hero.tint[o + 1] = c[1]
      hero.tint[o + 2] = c[2]
      hero.tint[o + 3] = gain
      hero.fx[o] = 0.2 + f * 0.18
      hero.fx[o + 1] = f * 0.6
      hero.fx[o + 2] = 1
      hero.fx[o + 3] = this._pushBody(st, tint, settle * fade)
    }
    // The star a stranger's @ opened: it is the hero of that dive, so it flares
    // to the same signature your own stars wear. Every dive in the product
    // lands the same way.
    if (focusing && this.diveSt && !this.diveSt.mine && this.diveSt.geom && hero.count < hero.capacity) {
      const g = this.diveSt.geom
      const f = this.cam.focus
      const k = hero.count++
      writeStar(hero.star, k, g.a, g.b, g.phi, omegaAt(g.a), TILT_RATE * g.a, g.y, tempToU(HERO_TEMP), HERO_LUM)
      const c = linearOf(this.you)
      const o = k * 4
      hero.tint[o] = c[0]
      hero.tint[o + 1] = c[1]
      hero.tint[o + 2] = c[2]
      hero.tint[o + 3] = 0.38 * (1 - f * 0.6)
      hero.fx[o] = 0.2 + f * 0.18
      hero.fx[o + 1] = f * 0.6
      hero.fx[o + 2] = 1
      hero.fx[o + 3] = this._pushBody(this.diveSt, this.you, 1)
    }
  }

  // ── the star you are close enough to see the face of ──────────────────────
  // A dive in this sky arrives at the same standoff the ambient sky's does, so
  // it lands on the same thing: a surface. Returns what the star pass should do
  // with its own disc — 1 = draw it, 0 = the body pass has it — and the band
  // between the two is a cross-fade rather than a swap. galaxy.js carries the
  // long note on why an additive photosphere is a ghost.
  _pushBody(st, tintHex, alive) {
    void tintHex
    if (!st || !st.geom) return 1
    const w = this._slotWorld(st)
    if (!w) return 1
    const scr = this.cam.project(w.x, w.y, w.z)
    if (!scr) return 1
    const radius = starRadius(this.gHero.radiusScale, HERO_TEMP, HERO_LUM)
    const hand = this.handoverOf(radius, scr.persp)
    if (hand <= 0.004) return 1
    const disc = this.discOf(radius, scr.persp)
    this.body.push(scr.sx, scr.sy, radius * this.cam.unit * scr.persp, HERO_RGB, SURFACE_B * this.gHero.dim * this.cam.exposure * alive, {
      cover: disc * hand,
      corona: 0.9,
      seed: st.i * 3.7 + 1.3,
      spin: this.t * 0.035 + st.i * 1.9,
      tip: 0.30 + (st.i % 3) * 0.12,
    })
    return 1 - hand
  }

  // ── the @ layer ───────────────────────────────────────────────────────────
  // Enough that the sky reads as inhabited by real people; never a roster.
  // Tags DECLUTTER: when two would collide the lower-priority one yields and
  // fades, so the sky never piles handles into a heap.
  _frameTags(dt) {
    if (!this.tagsEnabled || !this.publicTags.length) return
    const fade = (1 - this.cam.focus * 0.92) * this.dim * (1 - this.cam.rush * 0.7) * (1 - this.formingBlend)
    const taken = []
    const since = this.t - (this._tagsAt || 0)
    for (let ti = 0; ti < this.publicTags.length; ti++) {
      const tag = this.publicTags[ti]
      const st = tag.st
      // each handle waits its turn: a quiet one-by-one arrival, not a wall
      const due = this.reduced || since > 0.25 + ti * 0.16
      let want = false
      let x = 0, pillB = 0, wpx = 0, hpx = 0, spr = null, starY = 0
      if (due && st && st.state !== 'meteor' && fade > 0.03 && st.geom) {
        const w = this._slotWorld(st)
        const pr = w && this.cam.project(w.x, w.y, w.z)
        if (pr && pr.sx > 30 && pr.sx < this.w - 30 && pr.sy > 46 && pr.sy < this.h - 8) {
          const rel = pr.persp / (2.35 / 2.7)
          const size = clamp((tag.own ? 11 : 10) * Math.pow(clamp(rel, 0.4, 4), 0.45), 9, 16)
          spr = this.sprites.texture(`${tag.label}|${tag.own ? 1 : 0}`, () => bakeTag('@' + tag.label, { own: tag.own, you: this.you }))
          const sc = size / 11
          wpx = spr.w * sc
          hpx = spr.h * sc
          x = pr.sx
          starY = pr.sy
          pillB = pr.sy - clamp(9 * rel, 8, 20)
          const rect = { x0: x - wpx / 2, x1: x + wpx / 2, y0: pillB - hpx, y1: pillB }
          let clear = true
          for (const r of taken) {
            if (rect.x0 < r.x1 + 4 && rect.x1 > r.x0 - 4 && rect.y0 < r.y1 + 3 && rect.y1 > r.y0 - 3) {
              clear = false
              break
            }
          }
          if (clear) {
            taken.push(rect)
            want = true
          }
        }
      }
      tag.vis = clamp(tag.vis + (want ? 1 : -1) * dt * 3, 0, 1)
      tag.sx = want ? x : null
      tag.sy = want ? pillB - hpx / 2 : null
      if (tag.vis <= 0.02 || !want) continue
      tag.tw += dt * 0.5
      const a = (tag.own ? 0.95 : 0.72 + 0.07 * Math.sin(tag.tw)) * fade * smooth(tag.vis)
      // the stem — a hairline seating the pill on its own star, so a handle
      // reads as belonging to a light rather than floating as interface litter
      const stemC = tag.own ? linearOf(this.you, 0.5) : [0.35, 0.33, 0.4]
      const midY = (pillB + starY) / 2
      this.fx.screen(x, midY, Math.max(2, (starY - pillB) * 0.5), stemC, a * 0.5, 3, Math.PI / 2, 0.06)
      this.sprites.push(spr, x, pillB - hpx / 2, wpx, hpx, a)
    }
  }

  // ── the gathering community ───────────────────────────────────────────────
  // Below the privacy floor there is no count to show, so the sky is a real
  // proto-galaxy: the same volumetric cloud, turbulent and unformed, with
  // uncountable embers wandering inside it. Enough to read as "something is
  // gathering here" without ever being countable — the floor, made visible and
  // made beautiful.
  _frameForming(dt, fb) {
    void dt
    if (!this._motes) {
      this._motes = []
      let s = 74218
      const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280
      const n = this.tier >= 2 ? 34 : 68
      for (let i = 0; i < n; i++) {
        this._motes.push({
          ang: rnd() * TWO,
          // Seated out through the BODY of the cloud rather than piled on its
          // centre. The old distribution put its densest ring almost on the
          // axis, which stacked a dozen embers into one bright clot right where
          // the community's seal sits — and a clot is not a gathering.
          r: 0.22 + Math.pow(rnd(), 0.55) * 0.6,
          y: (rnd() - 0.5) * 0.07,
          spd: 0.03 + rnd() * 0.09,
          tw: rnd() * TWO,
          tws: 0.3 + rnd() * 0.8,
          hot: rnd() < 0.22,
          // fixed at birth: picking the colour with Math.random() every frame
          // made each ember strobe between white and blue at 60 Hz
          cool: rnd() < 0.5,
        })
      }
    }
    const R = this.diskR || 0.55
    const white = [1, 0.97, 0.93]
    const warm = linearOf('#FFC79A')
    const cool = linearOf('#9FC0FF')
    for (const m of this._motes) {
      m.ang += dt * m.spd
      m.tw += dt * m.tws
      const rr = m.r * R * 1.5
      const x = Math.cos(m.ang + this.pattern) * rr
      const z = Math.sin(m.ang + this.pattern) * rr
      const tw = 0.55 + 0.45 * Math.sin(m.tw)
      const col = m.hot ? warm : m.cool ? cool : white
      // A POINT of light, not a bokeh disc. These were drawn at a tenth of the
      // disk's radius, which on a phone is a forty-pixel soft ball — a field of
      // them read as an out-of-focus photograph rather than as a sky. Now each
      // ember is a small halo with a hard bright heart inside it, which is what
      // a star at this distance actually looks like.
      const halo = (0.017 + (m.hot ? 0.007 : 0)) * R
      this.fx.world(x, m.y, z, halo, col, fb * tw * this.dim * 1.9, 0)
      this.fx.world(x, m.y, z, halo * 0.3, white, fb * tw * this.dim * 6.5, 0)
      // the rare ember catching the light for a breath
      if (m.hot && Math.sin(m.tw * 0.5) > 0.985) {
        this.fx.world(x, m.y, z, 0.055 * R, white, fb * 1.6, 2)
      }
    }
  }
}

// sky/camera.js — one camera, one solver, both skies.
//
// The two canvas engines each carried their own copy of the camera: their own
// `_rot`, their own `_view`/`_project`, their own dive timeline, their own bank
// constants, their own easing. They were kept identical by hand, by comment,
// and by copy-paste, and the comments say so in both files. This is that camera,
// written once.
//
// Everything the viewer can do to the view is the same object here:
//
//   · the resting drift — the galaxy breathing, always
//   · pointer / device-tilt parallax — a whisper, and the first thing to yield
//   · the hand: orbit (drag) with release inertia, dolly (pinch / wheel)
//   · the dive: bank, then run, then hold — the cinematic flight to one star
//
// They are not four systems that fight over a matrix. They are four inputs to
// one orientation and one eye position, composed in a fixed order, so a dive
// that begins mid-drag simply blends, and orbiting during a held star view
// swings the whole sky around the star with real parallax instead of fighting
// the camera that is pinning it.
//
// The lens is deliberately the SAME lens the canvas engines used — the same
// CAM / FOCAL / TILT — so the rebuild does not silently re-frame the universe
// and every screen that was composed against this sky still composes.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const lerp = (a, b, t) => a + (b - a) * t
// the shortest way round the circle — angles are blended, never subtracted raw
const wrapAngle = (v) => Math.atan2(Math.sin(v), Math.cos(v))

export const CAM = 2.7 // eye distance from the galactic center
export const FOCAL = 2.35 // focal length (larger = flatter, less perspective)
export const TILT = 1.04 // the resting tilt of the disk toward the viewer

// How close, in camera-space depth, a dive comes to rest in front of its star.
// This is the one number that decides whether a star stays a distant point or
// resolves into a body: below about 0.02 world units the star's true angular
// diameter overtakes its point-spread function and it becomes a disc with a
// surface. The dive goes all the way in.
export const STANDOFF = 0.055

// The flight easing: Perlin's smootherstep. Flat-launched and flat-landed, and
// its peak velocity is only ~1.9x the mean where a quintic in-out's is 5x — the
// quintic hoards the whole journey into one violent mid-course whoosh. This
// SPENDS the travel across the flight: a long gathering acceleration, a
// sustained glide, a long exhale.
export const easeFlight = (p) => p * p * p * (p * (p * 6 - 15) + 10)
export const smooth = (p) => p * p * (3 - 2 * p)
export const easeOut = (p) => 1 - Math.pow(1 - p, 3)

// the dive, in three movements
const BANK_MIN = 0.9 // the swing's length breathes with how far it must travel
const BANK_MAX = 1.6
const BANK_TILT = 0.34 // the banked tilt: the galaxy turned to its side axis
const RUN_IN = 2.6 // the camera's committed run into the star
const RUN_OUT = 1.2 // and the glide back out — a close is an exit, not a scene
// The run ignites early in the bank's swing, so the turn and the dive read as
// ONE continuous gesture. Sequencing them — bank, stop, run — is what felt
// robotic, and even a late ignition read as two separate moves.
const OVERLAP = 0.24

export class Camera {
  constructor() {
    // ── orientation ──
    this.azimuth = 0 // the slow resting turn around the galaxy
    this.tilt = TILT
    this.parallax = { x: 0, y: 0 } // smoothed pointer / device tilt
    this.parallaxTarget = { x: 0, y: 0 }
    this.parallaxGain = 0.3
    this.orbit = { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0 }
    this.orbitLimits = { yaw: Math.PI, pitchMin: -1.15, pitchMax: 1.15 }
    this.orbitHome = true // unwind toward rest when the hand is gone
    this.dragging = false

    // ── the eye ──
    // A view-aligned offset from the resting eye. (0,0,0) is the resting camera;
    // during a dive it travels laterally to frame the star and forward to close
    // on it, and every layer in the sky reads it, so the WHOLE field flies past
    // as one body rather than the hero being scaled up out of a still picture.
    this.eye = { x: 0, y: 0, z: 0 }
    this.prevEye = { x: 0, y: 0, z: 0 }

    // ── the hand's dolly (the community sky's free zoom) ──
    this.zoom = 1
    this.zoomTarget = 1
    this.zoomVel = 0
    this.zoomFocus = { x: 0, z: 0 }
    this.zoomMax = 14

    // ── the dive ──
    this.dive = null // { t, held, released }
    this.diveTarget = null // () => {x,y,z} in world space, re-read every frame
    this.diveDist = 1 // pinch-adjustable standoff multiplier while held
    this.standoff = STANDOFF
    this.focus = 0 // eased 0..1 — how far into the run we are
    this.bank = 0 // eased 0..1 — how far through the turn
    this.bankAim = null // { yaw, tilt } computed once, at the dive's start
    this.bankDur = 0.85
    this.holdDur = 1.9 // mirrored from the engine each update; releaseDive reads it
    this._bankPrev = 0
    this._bankVel = 0

    // ── the chase ──
    // A dive flies to something that is standing still. A chase follows
    // something that is RUNNING — and the difference is not the path, it is
    // where the camera looks. A dive keeps the galaxy's own horizon and closes
    // on a point in it. A chase turns to face the direction of travel, so the
    // field opens out around the frame and streams past on every side instead
    // of swelling toward the middle. That is what makes it a point of view
    // rather than a zoom. `focus` and `standoff` are shared with the dive on
    // purpose: holding a target at a fixed camera-space depth is the same solve
    // either way, and only the LOOK differs.
    this.chase = null
    this.chaseAim = null // () => a world-space direction of travel
    this._aimYaw = null
    this._aimTilt = null

    // ── the instruments ──
    // How hard the camera is actually travelling. Every layer reads `rush`: the
    // field streaks along its own apparent motion, exposure lifts, tags yield.
    // It is measured from real eye velocity rather than set by whatever gesture
    // is running, so a dive, a fling and a pinch all feel like the same physics.
    this.travel = 0
    this.rush = 0
    this.exposure = 1

    // ── the frame ──
    this.w = 1
    this.h = 1
    this.cx = 0.5
    this.cy = 0.5
    this.unit = 1 // world units → pixels at the galactic center
    this.reduced = false

    // the composed basis, rebuilt once per frame
    this.R = new Float32Array(9) // world → view
    this.Rt = new Float32Array(9) // view → world
    this.eyeWorld = new Float32Array(3)
  }

  setFrame(w, h, cx, cy, unit) {
    this.w = w
    this.h = h
    this.cx = cx
    this.cy = cy
    this.unit = unit
  }

  // ── the hand ──────────────────────────────────────────────────────────────
  dragBy(dx, dy) {
    const L = this.orbitLimits
    this.orbit.yaw = clamp(this.orbit.yaw + dx, -L.yaw, L.yaw)
    this.orbit.pitch = clamp(this.orbit.pitch - dy, L.pitchMin, L.pitchMax)
    this.orbit.vyaw = dx * 60
    this.orbit.vpitch = -dy * 60
  }
  fling() {
    // the coast past release is already stored in vyaw/vpitch; nothing to do
    // but stop treating the pointer as authoritative
    this.dragging = false
  }
  dollyTo(z, focus) {
    this.zoomTarget = clamp(z, 1, this.zoomMax)
    if (focus) this.zoomFocus = focus
  }
  resetView() {
    this.zoomTarget = 1
    this.orbit.vyaw = 0
    this.orbit.vpitch = 0
  }

  // ── the dive ──────────────────────────────────────────────────────────────
  // `target` is a FUNCTION, not a point: the stars genuinely orbit now, so the
  // thing being flown to keeps moving and the camera has to re-solve against it
  // every frame. (This is also why the engine slows the orbit clock as `focus`
  // rises — the target holds still under the flight path without ever being
  // frozen outright, so the sky never visibly stops.)
  startDive(target, opts = {}) {
    this.diveTarget = target
    this.diveDist = 1
    // Most dives arrive close enough that the star resolves into a body. A
    // match does not: it needs to arrive far enough out that BOTH stars are in
    // frame, because the whole point of it is that there are two.
    this.standoff = opts.standoff != null ? opts.standoff : STANDOFF
    this.dive = { t: 0, held: !!opts.hold }
    // Aim the bank once, at the start: swing the galaxy so the star comes
    // around the NEAR side, and drop the tilt toward its side axis. The swing's
    // length breathes with how far it has to travel, so a star already in front
    // of the viewer gets a short turn and one behind gets a long one.
    const p = target()
    if (p) {
      const world = Math.atan2(p.z, p.x)
      const wrap = (v) => Math.atan2(Math.sin(v), Math.cos(v))
      const yawGoal = wrap(world - this.azimuth + Math.PI / 2)
      this.bankAim = { yaw: yawGoal, tilt: opts.tilt != null ? opts.tilt : BANK_TILT }
      this.bankDur = BANK_MIN + (BANK_MAX - BANK_MIN) * (Math.abs(yawGoal) / Math.PI)
    } else {
      this.bankAim = null
      this.bankDur = 0.85
    }
    // a dive owns the camera — release any hand-held dolly first
    this.zoomTarget = 1
  }
  // End a held star view: jump the timeline to the start of the pull-out so the
  // camera glides home along the same path it came in on.
  //
  // Note where that start actually IS. Once `held` drops, `update` runs the
  // ordinary timeline, which holds the frame for `holdDur` seconds BEFORE the
  // pull-out begins — so landing the clock on `inEnd` left the close button
  // sitting on a frozen sky for the better part of two seconds and reading as a
  // tap that did nothing. The pull-out starts at inEnd + holdDur; that is where
  // a release belongs.
  releaseDive(delay = 0) {
    if (this.dive && this.dive.held) {
      const inEnd = Math.max(this.bankDur, this.bankDur * OVERLAP + RUN_IN)
      this.dive = { t: inEnd + this.holdDur + delay, held: false }
    }
  }
  // ── the chase ─────────────────────────────────────────────────────────────
  // Lock a fixed distance behind a moving target and look along its path.
  //
  // Almost all of this reuses the dive's own solver: "hold the target at a
  // constant camera-space depth" is exactly what `_solveEye` already does at
  // focus = 1, and the target being a function means it may move as fast as it
  // likes. What a chase adds is the LOOK — the basis is aimed down the flight
  // vector rather than left on the galaxy's resting horizon — and a small
  // deliberate misalignment between the two, so you are behind the subject and
  // a little off its shoulder rather than staring straight up its exhaust.
  //
  // `aim` is separate from `target` on purpose. A path's direction is its
  // derivative, and asking the caller for it is both exact and free; deriving
  // it here from frame-to-frame position differences would hand the camera's
  // entire orientation to whatever numerical noise the path carries.
  startChase(target, opts = {}) {
    this.dive = null
    this.bank = 0
    this.bankAim = null
    this.diveTarget = target
    this.chaseAim = opts.aim || null
    this.chase = {
      t: 0,
      // how long the camera takes to fall in behind the subject
      grabDur: opts.grab != null ? opts.grab : 0.5,
      // the off-the-shoulder angles: yaw puts the flight line off to one side
      // of the frame, tilt looks slightly down along it
      yawOff: opts.yawOff != null ? opts.yawOff : 0.21,
      tiltOff: opts.tiltOff != null ? opts.tiltOff : 0.13,
      // where the subject sits on the glass, as a fraction of the short side
      offX: opts.offX != null ? opts.offX : 0.11,
      offY: opts.offY != null ? opts.offY : -0.075,
      out: 0, // the pull-out, driven from outside as the flight ends
    }
    this.standoff = opts.standoff != null ? opts.standoff : 0.42
    this.diveDist = 1
    this._aimYaw = null
    this._aimTilt = null
    this.zoomTarget = 1
  }
  // How far the camera has let go, 0..1. The caller owns this because the
  // caller owns the flight's timeline; the camera only has to unwind smoothly.
  setChaseOut(v) {
    if (this.chase) this.chase.out = clamp(v, 0, 1)
  }
  endChase() {
    if (!this.chase) return
    this.chase = null
    this.chaseAim = null
    this.diveTarget = null
    this.focus = 0
    this._aimYaw = null
    this._aimTilt = null
  }
  get chasing() {
    return !!this.chase
  }

  get diving() {
    return !!this.dive
  }
  get held() {
    return !!(this.dive && this.dive.held)
  }

  // ── the frame's integration ───────────────────────────────────────────────
  // Returns how much the galaxy's own clocks should advance this frame: a dive
  // nearly stills the sky so the target sits steady under the flight path, and
  // it comes back to life on the way out.
  update(dt, opts = {}) {
    const holdDur = opts.holdDur != null ? opts.holdDur : 1.9
    this.holdDur = holdDur

    // the chase's own timeline is trivial: fall in behind the subject, hold
    // there for as long as it runs, let go when the caller says so. All the
    // shape of the flight lives in the PATH, not in the camera.
    if (this.chase) {
      this.chase.t += dt
      const grab = easeFlight(clamp(this.chase.t / this.chase.grabDur, 0, 1))
      this.focus = grab * (1 - easeFlight(this.chase.out))
      this.bank = 0
    }

    // the dive timeline — bank leading, run igniting inside the swing, both
    // completing together, then the hold, then the return as one unwind
    if (this.dive) {
      const runStart = this.bankDur * OVERLAP
      const inEnd = Math.max(this.bankDur, runStart + RUN_IN)
      this.dive.t = this.dive.held ? Math.min(this.dive.t + dt, inEnd) : this.dive.t + dt
      const t = this.dive.t
      if (t < inEnd) {
        this.bank = easeFlight(clamp(t / this.bankDur, 0, 1))
        this.focus = easeFlight(clamp((t - runStart) / RUN_IN, 0, 1))
      } else if (this.dive.held || t < inEnd + holdDur) {
        this.bank = 1
        this.focus = 1
      } else if (t < inEnd + holdDur + RUN_OUT) {
        const q = easeFlight(1 - (t - inEnd - holdDur) / RUN_OUT)
        this.focus = q
        this.bank = q
      } else {
        this.dive = null
        this.diveTarget = null
        this.focus = 0
        this.bank = 0
        this.bankAim = null
      }
    } else if (!this.chase) {
      this.focus = 0
      if (this.bank > 0) {
        // a dive torn down mid-flight (the star was released, the sky reseeded):
        // the bank glides home rather than snapping
        this.bank = Math.max(0, this.bank - dt * 2.2)
        if (this.bank <= 0.002) {
          this.bank = 0
          this.bankAim = null
        }
      }
    }
    this._bankVel = dt > 0 ? Math.abs(this.bank - this._bankPrev) / dt : 0
    this._bankPrev = this.bank

    // parallax — smoothed toward the pointer, and the FIRST thing to yield when
    // the camera takes over, so a dive is never nudged by a stray mouse move
    const hold = 1 - Math.max(this.focus, this.bank)
    this.parallax.x = lerp(this.parallax.x, this.parallaxTarget.x, Math.min(1, dt * 2.6))
    this.parallax.y = lerp(this.parallax.y, this.parallaxTarget.y, Math.min(1, dt * 2.6))

    // the orbit's inertia: it coasts past the release and then RESTS where the
    // hand left it. Nothing snaps back on a timer — the sky is a place to be,
    // not a control that returns to center.
    if (!this.dragging) {
      const L = this.orbitLimits
      this.orbit.yaw = clamp(this.orbit.yaw + this.orbit.vyaw * dt, -L.yaw, L.yaw)
      this.orbit.pitch = clamp(this.orbit.pitch + this.orbit.vpitch * dt, L.pitchMin, L.pitchMax)
      const dec = Math.exp(-dt * 2.4)
      this.orbit.vyaw *= dec
      this.orbit.vpitch *= dec
      if (this.orbitHome && !this.held) {
        const home = Math.min(1, dt * 1.7)
        this.orbit.yaw = lerp(this.orbit.yaw, 0, home)
        this.orbit.pitch = lerp(this.orbit.pitch, 0, home)
      }
    }

    // The dolly is a critically-damped SPRING, not an exponential lerp. A lerp
    // jumps to full closing speed the instant the target moves and dies off
    // asymmetrically, which is the robotic feel. A spring accelerates INTO the
    // move and exhales out of it — real inertia, a ship committing to a burn —
    // and its velocity is exactly what the streak pass renders as travel.
    if (this.zoom !== this.zoomTarget || Math.abs(this.zoomVel) > 0.0005) {
      const k = 30
      const c = 2 * Math.sqrt(k)
      const x = this.zoom - this.zoomTarget
      this.zoomVel += (-k * x - c * this.zoomVel) * dt
      this.zoom += this.zoomVel * dt
      if (this.zoom < 1) {
        this.zoom = 1
        if (this.zoomVel < 0) this.zoomVel = 0
      } else if (this.zoom > this.zoomMax) {
        this.zoom = this.zoomMax
        if (this.zoomVel > 0) this.zoomVel = 0
      }
      if (Math.abs(this.zoom - this.zoomTarget) < 0.0015 && Math.abs(this.zoomVel) < 0.004) {
        this.zoom = this.zoomTarget
        this.zoomVel = 0
      }
    }

    // the resting drift: a slow, endless breath. It is the smallest motion in
    // the product and the one that makes a still screen feel inhabited.
    const drift = Math.sin(opts.t * 0.11) * 0.06 * hold
    const driftT = Math.sin(opts.t * 0.083) * 0.022 * hold

    // A held star view keeps the hand's orbit fully alive — the camera re-aims
    // at the star every frame, so orbiting swings the whole sky around the hero
    // with true parallax while it stays pinned in the crosshairs.
    const ow = this.held ? 1 : hold
    let yaw =
      this.azimuth +
      this.parallax.x * this.parallaxGain * hold +
      drift +
      this.orbit.yaw * ow +
      (this.bankAim ? this.bankAim.yaw * this.bank : 0)
    let tilt =
      TILT +
      (this.parallax.y * this.parallaxGain * 0.62 + driftT) * hold +
      this.orbit.pitch * ow +
      (this.bankAim ? (this.bankAim.tilt - TILT) * this.bank : 0)

    // ── looking down the flight line ─────────────────────────────────────────
    // Solve the basis that maps the direction of travel onto +z in view space —
    // dead ahead, into the screen. With R = Rx(tilt)·Ry(yaw) it comes out in
    // closed form: kill the horizontal component to get the yaw, then the
    // vertical to get the tilt. No iteration, no look-at matrix, and the result
    // composes with everything above as one more term rather than replacing the
    // camera with a second one.
    if (this.chase && this.chaseAim && this.focus > 0.0005) {
      const d = this.chaseAim()
      if (d) {
        const h = Math.hypot(d.x, d.z)
        if (h > 1e-7 || Math.abs(d.y) > 1e-7) {
          const wantYaw = Math.atan2(-d.x, d.z) + this.chase.yawOff
          const wantTilt = Math.atan2(d.y, Math.max(h, 1e-7)) + this.chase.tiltOff
          // The camera LAGS. A rig bolted rigidly to its subject's velocity
          // vector transmits every wobble in the path straight to the horizon,
          // which is nauseating and reads as a bug; a real chase camera is a
          // heavy thing being dragged along behind, and the lag is most of what
          // sells it as a point of view rather than a rail.
          if (this._aimYaw == null) {
            this._aimYaw = wantYaw
            this._aimTilt = wantTilt
          } else {
            const k = Math.min(1, dt * 3.2)
            this._aimYaw += wrapAngle(wantYaw - this._aimYaw) * k
            this._aimTilt += (wantTilt - this._aimTilt) * k
          }
          const w = this.focus
          yaw += wrapAngle(this._aimYaw - yaw) * w
          tilt += (this._aimTilt - tilt) * w
        }
      }
    }
    this.tilt = tilt

    this._basis(yaw, tilt)
    this._solveEye()
    this._instruments(dt)

    // how much the galaxy's own clocks advance: nearly stilled through the
    // whole dive (bank included), fully alive everywhere else
    return 1 - Math.max(this.focus, this.bank) * 0.94
  }

  // world → view is Rx(tilt) · Ry(yaw). Both engines composed two successive
  // Y-rotations (a spin and a yaw) that were always going to collapse into one;
  // here they are one.
  _basis(yaw, tilt) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const ct = Math.cos(tilt), st = Math.sin(tilt)
    const R = this.R
    // row-major: R = Rx(tilt) * Ry(yaw)
    R[0] = cy;      R[1] = 0;   R[2] = sy
    R[3] = st * sy; R[4] = ct;  R[5] = -st * cy
    R[6] = -ct * sy; R[7] = st; R[8] = ct * cy
    const T = this.Rt
    T[0] = R[0]; T[1] = R[3]; T[2] = R[6]
    T[3] = R[1]; T[4] = R[4]; T[5] = R[7]
    T[6] = R[2]; T[7] = R[5]; T[8] = R[8]
  }

  // rotate a world point into view-aligned space
  view(x, y, z, out) {
    const R = this.R
    out = out || { x: 0, y: 0, z: 0 }
    out.x = R[0] * x + R[1] * y + R[2] * z
    out.y = R[3] * x + R[4] * y + R[5] * z
    out.z = R[6] * x + R[7] * y + R[8] * z
    return out
  }

  _solveEye() {
    const e = this.eye
    if (this.focus > 0.0005 && this.diveTarget) {
      const p = this.diveTarget()
      if (p) {
        const T = this.view(p.x, p.y, p.z, this._tmp || (this._tmp = {}))
        const f = this.focus
        // The travel is GEOMETRIC, not linear. What the eye reads in a zoom is
        // the MAGNIFICATION rate, and magnification goes as 1/depth — so easing
        // depth linearly detonates nearly all of the apparent zoom in the final
        // stretch, which is the "quick dart". Instead the target's camera-space
        // depth glides to the standoff along a log-space curve: each second
        // multiplies the magnification by the same factor, one even swell from
        // the first inch of travel to the last.
        const S = this.standoff || STANDOFF
        const zc0 = Math.max(CAM + T.z, S + 0.02)
        const stand = Math.min(S * this.diveDist, zc0 * 0.985)
        const depth = zc0 * Math.pow(stand / zc0, f)
        // The lateral line is solved against that same depth, so the star's
        // screen offset shrinks exactly with (1 - f): the hero glides into the
        // crosshairs on one continuous eased path instead of whipping across
        // the axis as the perspective steepens near arrival.
        const fLat = 1 - (1 - f) * (depth / zc0)
        e.x = fLat * T.x
        e.y = fLat * T.y
        e.z = CAM + T.z - depth
        // A chase does not put its subject in the crosshairs — that is a
        // gunsight, not a camera. Slide the eye so the star sits off-centre on
        // the glass, with the space it is flying into open in front of it.
        // Solved against the SAME depth the standoff produced, so the offset is
        // a fixed fraction of the frame at every point in the flight rather
        // than something that drifts as the perspective changes.
        if (this.chase) {
          const m = Math.min(this.w, this.h)
          const persp = FOCAL / Math.max(depth, 1e-5)
          const k = (f * m) / Math.max(this.unit * persp, 1e-5)
          e.x -= this.chase.offX * k
          e.y -= this.chase.offY * k
        }
        return
      }
    }
    if (this.zoom > 1.001) {
      // the hand's dolly: magnify the focused point by ~zoom x (its camera-space
      // depth shrinks to zc0/zoom) while sliding it toward frame center. Nearer
      // stars swell faster than far ones, so the lean-in reads as real depth
      // rather than as scale. At zoom = 1 the offset is exactly zero — the
      // identity camera, no seam with the resting sky.
      const T = this.view(this.zoomFocus.x, 0, this.zoomFocus.z, this._tmp || (this._tmp = {}))
      const zc0 = CAM + T.z
      const cen = 1 - 1 / this.zoom
      e.x = cen * T.x
      e.y = cen * T.y
      e.z = cen * zc0
      return
    }
    e.x = e.y = e.z = 0
  }

  _instruments(dt) {
    if (dt > 0) {
      const vx = (this.eye.x - this.prevEye.x) / dt
      const vy = (this.eye.y - this.prevEye.y) / dt
      const vz = (this.eye.z - this.prevEye.z) / dt
      const target = clamp(Math.hypot(vx, vy, vz) / 1.9, 0, 1)
      // rises fast, falls slow: acceleration should be felt immediately and
      // should take a moment to settle, like a real body coming to rest
      this.travel = lerp(this.travel, target, Math.min(1, dt * (target > this.travel ? 12 : 3.2)))
    }
    this.prevEye.x = this.eye.x
    this.prevEye.y = this.eye.y
    this.prevEye.z = this.eye.z
    const swing = clamp((Math.abs(this.orbit.vyaw) + Math.abs(this.orbit.vpitch)) * 0.012, 0, 0.7)
    // the bank is real camera motion too: while the galaxy swings to its side
    // axis the field must stream, or the turn reads as a re-frame
    const bank = this.bankAim
      ? clamp(this._bankVel * (Math.abs(this.bankAim.yaw) + (TILT - this.bankAim.tilt)) * 0.6, 0, 0.85)
      : 0
    this.rush = this.reduced ? 0 : Math.max(this.travel, swing, bank)
    // Exposure is the ONE instrument that touches every pixel at once, so it is
    // the one that must never be driven straight off a raw input. `swing` is
    // recomputed from the last pointer delta, which on a finger arrives in
    // uneven bursts — fed in directly it made the entire frame flicker in
    // brightness while a held star was being orbited. Smaller lift, and eased.
    const wantExp = 1 + this.rush * 0.18
    this.exposure += (wantExp - this.exposure) * Math.min(1, dt * 3.4)

    // The eye's world position, which the volumetric march needs as its ray
    // origin. The eye sits at view-space (ex, ey, ez - CAM) looking down +z.
    const T = this.Rt
    const ex = this.eye.x, ey = this.eye.y, ez = this.eye.z - CAM
    this.eyeWorld[0] = T[0] * ex + T[1] * ey + T[2] * ez
    this.eyeWorld[1] = T[3] * ex + T[4] * ey + T[5] * ez
    this.eyeWorld[2] = T[6] * ex + T[7] * ey + T[8] * ez
  }

  // Project a world point to screen. The CPU mirror of the vertex shader — used
  // wherever the engine must KNOW where something landed: seating an @ over its
  // star, hit-testing a tap, telling React where a label goes. Returns null when
  // the point is behind the camera, which is how things the camera dives past
  // simply leave the frame.
  project(x, y, z, out) {
    const R = this.R
    const vx = R[0] * x + R[1] * y + R[2] * z - this.eye.x
    const vy = R[3] * x + R[4] * y + R[5] * z - this.eye.y
    const vz = R[6] * x + R[7] * y + R[8] * z
    const zc = CAM + vz - this.eye.z
    // Matches the vertex shader's own near cutoff. They MUST agree: this is
    // what tells the DOM where a star landed, and a stricter limit here means
    // that at the end of a dive — exactly when the overlay needs the anchor —
    // the engine reports the star as off-screen while the GPU is drawing it
    // dead centre.
    if (zc <= 0.0035) return null
    const persp = FOCAL / zc
    out = out || {}
    out.sx = this.cx + vx * this.unit * persp
    out.sy = this.cy + vy * this.unit * persp
    out.zc = zc
    out.persp = persp
    return out
  }

  // Unproject a screen point onto the galactic plane (y = 0). A few Newton
  // passes over the perspective divide — enough to converge to well under a
  // pixel, and cheap enough to run per pointer event.
  planePoint(px, py, limit = 2.2) {
    const T = this.Rt
    // the plane's basis in view space is the first and third columns of R
    const R = this.R
    const Ax = R[0], Ay = R[3], Az = R[6] // world +x in view space
    const Bx = R[2], By = R[5], Bz = R[8] // world +z in view space
    let zc = CAM
    let a = 0, b = 0
    for (let i = 0; i < 5; i++) {
      const persp = FOCAL / zc
      const x = (px - this.cx) / (this.unit * persp) + this.eye.x
      const y = (py - this.cy) / (this.unit * persp) + this.eye.y
      const det = Ax * By - Bx * Ay
      if (Math.abs(det) < 1e-7) break
      a = (x * By - Bx * y) / det
      b = (Ax * y - x * Ay) / det
      zc = CAM + a * Az + b * Bz - this.eye.z
      if (zc < 0.2) zc = 0.2
    }
    const rr = Math.hypot(a, b)
    if (rr > limit) {
      const f = limit / rr
      a *= f
      b *= f
    }
    void T
    return { x: a, z: b }
  }
}

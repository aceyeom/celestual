# CELESTUAL — Bug & polish audit

Investigation of reported problems: auth/identity leaks, the "vibrating" app
inside the Instagram in-app browser, laggy/low-framerate result screens on
mobile, and rough animations/transitions. Each item lists **where** it lives,
the **root cause**, and a **proposed fix**. Severity: 🔴 critical · 🟠 high ·
🟡 medium · ⚪ polish.

> **Status: all items below have been implemented.** ✅ markers note where the
> fix landed. The "Suggested order of work" section at the bottom records the
> sequence taken.

---

## 1 · Auth & identity

### 1.1 🔴 The profile chip + account sheet expose an *unverified* @ as your account
**Reported by user.** Type your @ on the **you** step, *don't* verify, hit
**back** → the top-left chip shows `@yourhandle`, and tapping it opens the full
account sheet (handle, email, display name, your sky, sign-out, delete).

- `app/src/App.jsx:686` —
  `showProfile = screen === 'resting' || (screen === 'landing' && !!me)`.
  The chip appears as soon as `me` is non-empty. It never checks `verified`.
- `app/src/App.jsx:715-719` renders `<ProfileButton handle={me} …>` with the raw
  typed handle.
- `app/src/components/screens.jsx:756` `AccountSheet` renders every identity
  field regardless of `ctx.verified`. The only thing gated on verification is the
  "sign out" button (`signedIn = !!ctx.verified`, line 765) and the "signed in /
  local only" banner — the **data itself is always shown**.

**Why it's a real problem:** identity is supposed to be proven by the Instagram
DM before it "counts" (`auth.js` header; `verified` logic at `App.jsx:90-94`).
Here a handle that was merely *typed* — possibly not even the user's — is
presented as an established, owned account. It's also the privacy leak the user
felt: an abandoned, unverified handle is surfaced as "you."

**Fix:**
- Gate the chip on identity: `showProfile = … && ctx.verified` (or a dedicated
  "has a real account" predicate). Before verification there is no account to
  show.
- In `AccountSheet`, when `!verified`, either don't mount it or show only a
  "verify your @ to manage your account" state instead of the populated fields.

### 1.2 🟠 The typed handle is persisted to `localStorage` immediately, before any verification
- `app/src/App.jsx:138-146` writes `{ screen, email, me, displayName, … }` to
  `celestual:v1` on *every* change to `me`.
- Result: typing a handle and abandoning the flow leaves that @ (and any email/
  name typed) stored on the device. On the next visit `init` (`App.jsx:61-67`)
  restores it and the unverified identity reappears — feeding 1.1 even after a
  reload.

**Fix:** don't persist `me`/`email`/`displayName` as account identity until the
handle is verified (or until at least one star is sealed). Keep an in-memory
draft; only commit to storage after `markVerified`.

### 1.3 🟡 "Sign back in" can land on a *different* handle's local sky
- `app/src/api/profile.js:86-103` `readLocalSky()` returns whatever sky is in
  `celestual:sky` regardless of which handle is signing in.
- `App.jsx:474-491` `restoreSky()` on the stub/local path (no real backend) lands
  on `resting` with the previously-stored sky even if `me` is a brand-new handle.

**Fix:** key the local sky by normalized handle, or clear/ignore it when the
sign-in handle doesn't match the stored one.

### 1.4 🟡 `verified` flips off correctly on handle edit, but the account sheet lets you edit `me` while "verified"
- `App.jsx:90-94`: editing `me` drops `verified` for the `instagram_dm`
  provider (good). But `AccountSheet` exposes an editable handle field
  (`screens.jsx:818`). Editing it there silently de-verifies the session while
  the sheet still presents everything as signed-in. At minimum the sheet should
  reflect the de-verified state live.

---

## 2 · Instagram in-app browser ("vibrating / glitchy")

### 2.1 🟠 Viewport-resize thrash from the IG toolbar collapsing on scroll
Instagram's in-app webview shows/hides its chrome as the page scrolls, which
continuously changes the dynamic viewport height. Two things react to that on
every change and fight each other:

- The canvas parent is a `position: fixed; inset: 0` div, so its height tracks
  the viewport. `GalaxyCanvas` attaches a `ResizeObserver` to that parent
  (`app/src/components/ui.jsx:55-58`) and calls `f.resize()` on every change.
- `resize()` (`app/src/galaxy.js:327-341`) **reallocates the canvas backing
  store** (`canvas.width = w*dpr`) and recomputes layout each time — an expensive
  clear+realloc fired repeatedly as the toolbar animates.
- Screens are `min-height: 100dvh` (`screens.jsx:31`, `styles.css:21`), so the
  content column also resizes in lockstep, producing the oscillating "vibration."

**Fix:**
- Debounce `resize()` (e.g. trailing 150ms) and **skip reallocation when only the
  height changed by a small toolbar delta** (track last w/h; ignore sub-threshold
  height-only changes).
- Consider sizing the galaxy to `100vh`/`visualViewport` rather than the fixed
  div's live height so toolbar show/hide doesn't reshape the canvas.
- Use `window.visualViewport` resize events (coalesced) instead of observing the
  fixed element.

### 2.2 🟠 Unfiltered `deviceorientation` parallax makes the field micro-shake
- `app/src/galaxy.js:307-311` maps raw `gamma`/`beta` straight to camera yaw/tilt
  with no dead-zone and no low-pass filtering. Held-in-hand sensor noise feeds a
  constant jitter into `pTarget`, and the lerp (`galaxy.js:550-551`) chases it
  every frame — the galaxy visibly trembles. Inside a webview this reads as the
  "whole app vibrating."

**Fix:** add a dead-zone + exponential smoothing (or a small rounding) to the
tilt input, and/or gate `deviceorientation` behind an explicit opt-in. The
pointer-parallax path is fine; the sensor path is the culprit.

### 2.3 🟡 `window.open(ig.me/…)` from inside the IG webview
- `screens.jsx:1189` and `App.jsx:632` open `ig.me`/`instagram.com` via
  `window.open(_blank)`. Inside Instagram's own in-app browser this often no-ops
  or bounces, breaking the DM-verification hand-off precisely for the users who
  arrived *from* Instagram.

**Fix:** detect the in-app browser (UA sniff for `Instagram`) and use a direct
`location.href` deep-link, plus a visible "open Instagram" fallback and a manual
"I've sent the DM" affordance.

---

## 3 · Performance (laggy result screens, low framerate on mobile)

### 3.1 🔴 Per-frame canvas gradient allocation
Creating gradients every frame is the single biggest mobile cost here. Re-built
on *every* rendered frame:

- `app/src/galaxy.js:569` background `createLinearGradient`
- `app/src/galaxy.js:614` core-glow `createRadialGradient`
- `app/src/galaxy.js:767` nebula `createRadialGradient` — **× 13 clouds per
  frame**
- `app/src/galaxy.js:949,975` match-screen `createLinearGradient` +
  `createRadialGradient` per frame (this is the **match result screen** the user
  called out as laggy)

The disk-haze gradient is already cached (`galaxy.js:710-717`) — the same
treatment should be applied to the rest.

**Fix:** build these gradients once (in local/unit space) and reuse them via the
existing transform/`globalAlpha` approach, exactly like `_hazeGrad`. For the
nebula, cache one gradient per cloud (color+radius are stable) instead of
rebuilding 13/frame.

### 3.2 🔴 `StarTags` forces a synchronous layout every animation frame
- `app/src/components/ui.jsx:104-108`: inside the `requestAnimationFrame` tick it
  runs `document.querySelectorAll('[data-tag-keepout]')` and
  `getBoundingClientRect()` on each result **every frame**. That forces layout/
  reflow 60×/sec on top of the galaxy's own rAF loop — classic mobile jank, and
  it runs on the **sendoff** and **resting** screens.

**Fix:** cache the keep-out rects and only re-measure on resize/scroll/screen
change (or throttle to a few Hz). The tag *positions* must update per frame; the
keep-out rectangles do not.

### 3.3 🟠 Reduced-motion still runs a full render loop forever
- `app/src/galaxy.js:540-554`: in `reduced` mode it still calls `_draw(0)` and
  re-schedules `requestAnimationFrame` every frame indefinitely. The comment
  claims it "holds still," but it actually re-renders identical frames forever
  (including the per-frame gradients of 3.1). Reduced-motion gets none of the
  intended battery/CPU savings.

**Fix:** after the dim/settle transition completes in reduced mode, render one
final frame and `stop()` the loop (resume only on resize/mode change).

### 3.4 🟡 Two uncoordinated rAF loops, both heavy
The galaxy loop and the `StarTags` loop run independently and unthrottled. On a
low-end phone they compete for the main thread. Even after 3.2, consider driving
the tags from the galaxy's own frame callback so there's a single loop.

### 3.5 🟡 `requestAnimationFrame(this._tick.bind(this))` allocates a closure per frame
- `app/src/galaxy.js:364` and `:554` create a fresh bound function every frame.
  Minor GC pressure; bind once in the constructor (`this._tick = this._tick.bind(this)`).

### 3.6 🟡 `'lighter'` (additive) compositing over the full frame
Several passes composite additively across the whole canvas (core glow, haze,
nebula, match bloom fill `galaxy.js:980-981`). Additive full-frame fills are
GPU-bandwidth heavy at high DPR. After 3.1/3.3 this is less acute, but on the
match screen specifically the full-frame bloom `fillRect(0,0,w,h)` every frame is
worth bounding to the bloom's actual radius.

---

## 4 · Animations, transitions & workflow polish

### 4.1 🟠 Screen changes have no exit transition (hard cut)
- `app/src/App.jsx:721` `<div key={screen} className="fade">` remounts the whole
  screen on every navigation. The new screen fades in, but the old one is removed
  instantly — over the busy galaxy this reads as a jump/cut, not a transition.

**Fix:** add a brief cross-fade/exit (keep the outgoing screen ~200ms) or a
shared-layout transition. At minimum, fade the outgoing content.

### 4.2 🟡 First-paint flash of the empty resting sky
- `App.jsx:80` `firstScreen()` can resume directly to `resting`, but `handles`
  load asynchronously (`App.jsx:151-174`). On a returning visitor the resting
  screen paints its **empty state** for a frame before the stars arrive, then
  pops to the populated sky.

**Fix:** hold a "loading sky" state until `loadProfile()` resolves (the
`persistReady` ref is already there to hang this off), or render nothing until
the first reconcile.

### 4.3 🟡 Stale `data-sendoff-field`/morph origin on fast re-seal
- The Liftoff morph measures the field at seal time (`App.jsx:357-372`) and the
  overlay is torn down after a fixed `1320ms` (`App.jsx:373`). Rapid back-and-
  forth between `them` and `sendoff` can leave the morph overlay's geometry
  pointing at a field that's already unmounted. Tie the teardown to the actual
  animation/screen lifecycle rather than a magic timeout.

### 4.4 ⚪ ThemScreen comment is stale / misleading
- `app/src/components/screens.jsx:470` says the seal "opens the Instagram popup
  synchronously inside this gesture," but verification is now an in-tab overlay
  (no popup). Stale comment — update to avoid future confusion about gesture/
  clipboard requirements.

### 4.5 ⚪ `MatchScreen` `minHeight: 420` can overflow short viewports
- `screens.jsx:917` forces a 420px min on the hero block; on small/landscape
  phones this can push content under the CTA. Prefer flexible spacing.

### 4.6 ⚪ Custom star cursor swap can feel laggy on desktop
- `styles.css:33-37` sets a data-URI cursor on the whole app. Harmless on touch
  (disabled via `hover: none`), but on desktop trackpads the per-element cursor
  swaps add a little churn. Low priority; note only.

---

## Suggested order of work
1. **1.1 + 1.2** — the reported identity leak (gate the chip/sheet on `verified`,
   stop persisting unverified identity).
2. **3.1 + 3.2 + 3.3** — the mobile lag (cache gradients, stop per-frame layout in
   StarTags, actually halt the reduced-motion loop).
3. **2.1 + 2.2** — the Instagram-webview "vibration" (debounce/guard resize,
   filter tilt input).
4. **2.3, 4.1–4.3** — verification hand-off in-app, transitions, flashes.
5. Remaining polish (1.3, 1.4, 3.4–3.6, 4.4–4.6).

---

## Implementation summary (what shipped)

**Auth / identity**
- New `established` predicate in `App.jsx` (`verified || demo || has-a-sky`) gates
  the profile chip (`showProfile`) and is the only thing that lets identity be
  persisted — a bare typed handle is never shown or stored as an account (1.1/1.2).
- Encrypted-profile save and the `localStorage` resume blob both short-circuit
  until `established` (1.2).
- `restoreSky` no longer shows a different handle's device-local sky on the
  stub/no-backend path (`localSkyOwner` in `api/profile.js`) (1.3).
- Account sheet shows a "changing your @ re-verifies" hint and reflects the live
  de-verified state (1.4).

**Instagram in-app browser**
- `galaxy.resize()` ignores sub-130px height-only changes (toolbar collapse) and
  the `ResizeObserver` is rAF-coalesced, so the canvas no longer reallocates every
  toolbar frame (2.1).
- `deviceorientation` now has a dead-zone + low-pass filter, killing the sensor
  jitter (2.2).
- `openExternal` (and `App.openConversation`) fall back to a same-tab deep link
  when `window.open` is blocked; the verify sheet shows an in-app guidance note
  (2.3).

**Performance**
- All per-frame canvas gradients (backdrop, core glow, 13× nebula, match bloom)
  are built once and reused via transforms; the full-frame match bloom is bounded
  to its circle (3.1/3.6).
- `StarTags` caches keep-out rects and re-measures a few times a second instead of
  forcing layout every frame (3.2).
- Reduced-motion now genuinely halts the render loop once settled and resumes on
  any state change (3.3); the frame callback is bound once (3.5).

**Animation / workflow**
- Screen changes cross-fade via the View Transitions API (`App.go` + CSS), with an
  instant fallback and reduced-motion opt-out (4.1).
- The resting screen holds a placeholder while the sky loads (no empty-state
  flash) (4.2); the morph teardown timer is cancelled on re-seal/unmount (4.3).
- Stale comment corrected (4.4); match-screen min-height made viewport-relative
  (4.5).
</content>
</invoke>
